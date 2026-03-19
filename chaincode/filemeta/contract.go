package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

type Folder struct {
	Path      string `json:"path"`
	OwnerMSP  string `json:"ownerMsp"`
	OwnerID   string `json:"ownerId"`
	CreatedAt string `json:"createdAt"`
}

type FileACL struct {
	AllowedMSPs []string `json:"allowedMsps"`
}

type FileMetadata struct {
	FolderPath string  `json:"folderPath"`
	Name       string  `json:"name"`
	OwnerMSP   string  `json:"ownerMsp"`
	OwnerID    string  `json:"ownerId"`
	CreatedAt  string  `json:"createdAt"`
	UpdatedAt  string  `json:"updatedAt"`
	CID        string  `json:"cid"`
	SHA256     string  `json:"sha256"`
	Size       int64   `json:"size"`
	MimeType   string  `json:"mimeType"`
	Version    int64   `json:"version"`
	ACL        FileACL `json:"acl"`
}

func folderKey(path string) string {
	return "folder:" + normalizePath(path)
}

func fileKey(folderPath, name string) (string, error) {
	fp := normalizePath(folderPath)
	if fp == "" || fp == "/" {
		// root allowed; still store as file:/<name>
		fp = "/"
	}
	n := strings.TrimSpace(name)
	if n == "" || strings.Contains(n, "/") {
		return "", fmt.Errorf("invalid file name")
	}
	return "file:" + fp + "/" + n, nil
}

func normalizePath(p string) string {
	p = strings.TrimSpace(p)
	if p == "" {
		return ""
	}
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	p = strings.TrimRight(p, "/")
	if p == "" {
		return "/"
	}
	// collapse multiple slashes
	for strings.Contains(p, "//") {
		p = strings.ReplaceAll(p, "//", "/")
	}
	return p
}

func nowRFC3339() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}

func containsString(list []string, v string) bool {
	for _, item := range list {
		if item == v {
			return true
		}
	}
	return false
}

func (s *SmartContract) caller(ctx contractapi.TransactionContextInterface) (mspID string, id string, err error) {
	cid := ctx.GetClientIdentity()
	mspID, err = cid.GetMSPID()
	if err != nil {
		return "", "", fmt.Errorf("get MSPID: %w", err)
	}
	id, err = cid.GetID()
	if err != nil {
		return "", "", fmt.Errorf("get client ID: %w", err)
	}
	return mspID, id, nil
}

func (s *SmartContract) assertCanReadFile(ctx contractapi.TransactionContextInterface, meta *FileMetadata) error {
	mspID, id, err := s.caller(ctx)
	if err != nil {
		return err
	}
	if meta.OwnerMSP == mspID && meta.OwnerID == id {
		return nil
	}
	if containsString(meta.ACL.AllowedMSPs, mspID) {
		return nil
	}
	return errors.New("access denied")
}

func (s *SmartContract) CreateFolder(ctx contractapi.TransactionContextInterface, path string) error {
	path = normalizePath(path)
	if path == "" {
		return fmt.Errorf("path is required")
	}

	k := folderKey(path)
	existing, err := ctx.GetStub().GetState(k)
	if err != nil {
		return fmt.Errorf("read folder: %w", err)
	}
	if existing != nil {
		return fmt.Errorf("folder already exists: %s", path)
	}

	mspID, id, err := s.caller(ctx)
	if err != nil {
		return err
	}

	folder := Folder{
		Path:      path,
		OwnerMSP:  mspID,
		OwnerID:   id,
		CreatedAt: nowRFC3339(),
	}

	b, err := json.Marshal(folder)
	if err != nil {
		return fmt.Errorf("marshal folder: %w", err)
	}
	return ctx.GetStub().PutState(k, b)
}

func (s *SmartContract) PutFile(ctx contractapi.TransactionContextInterface, folderPath string, name string, cid string, sha256 string, size int64, mimeType string) (*FileMetadata, error) {
	if strings.TrimSpace(cid) == "" {
		return nil, fmt.Errorf("cid is required")
	}
	if strings.TrimSpace(sha256) == "" {
		return nil, fmt.Errorf("sha256 is required")
	}

	k, err := fileKey(folderPath, name)
	if err != nil {
		return nil, err
	}

	mspID, id, err := s.caller(ctx)
	if err != nil {
		return nil, err
	}

	stub := ctx.GetStub()
	existing, err := stub.GetState(k)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}

	ts := nowRFC3339()
	if existing == nil {
		meta := &FileMetadata{
			FolderPath: normalizePath(folderPath),
			Name:       strings.TrimSpace(name),
			OwnerMSP:   mspID,
			OwnerID:    id,
			CreatedAt:  ts,
			UpdatedAt:  ts,
			CID:        strings.TrimSpace(cid),
			SHA256:     strings.TrimSpace(sha256),
			Size:       size,
			MimeType:   strings.TrimSpace(mimeType),
			Version:    1,
			ACL: FileACL{
				AllowedMSPs: []string{mspID}, // default: owner org can read
			},
		}

		b, err := json.Marshal(meta)
		if err != nil {
			return nil, fmt.Errorf("marshal metadata: %w", err)
		}
		if err := stub.PutState(k, b); err != nil {
			return nil, err
		}
		return meta, nil
	}

	var meta FileMetadata
	if err := json.Unmarshal(existing, &meta); err != nil {
		return nil, fmt.Errorf("unmarshal metadata: %w", err)
	}

	// Only owner can update (simple PoC rule)
	if meta.OwnerMSP != mspID || meta.OwnerID != id {
		return nil, errors.New("only owner can update file")
	}

	meta.CID = strings.TrimSpace(cid)
	meta.SHA256 = strings.TrimSpace(sha256)
	meta.Size = size
	meta.MimeType = strings.TrimSpace(mimeType)
	meta.UpdatedAt = ts
	meta.Version++

	b, err := json.Marshal(&meta)
	if err != nil {
		return nil, fmt.Errorf("marshal metadata: %w", err)
	}
	if err := stub.PutState(k, b); err != nil {
		return nil, err
	}
	return &meta, nil
}

func (s *SmartContract) GetFile(ctx contractapi.TransactionContextInterface, folderPath string, name string) (*FileMetadata, error) {
	k, err := fileKey(folderPath, name)
	if err != nil {
		return nil, err
	}
	b, err := ctx.GetStub().GetState(k)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}
	if b == nil {
		return nil, fmt.Errorf("file not found")
	}

	var meta FileMetadata
	if err := json.Unmarshal(b, &meta); err != nil {
		return nil, fmt.Errorf("unmarshal metadata: %w", err)
	}
	if err := s.assertCanReadFile(ctx, &meta); err != nil {
		return nil, err
	}
	return &meta, nil
}

func (s *SmartContract) ListFolder(ctx contractapi.TransactionContextInterface, folderPath string) ([]*FileMetadata, error) {
	fp := normalizePath(folderPath)
	if fp == "" {
		fp = "/"
	}

	prefix := "file:" + fp + "/"
	endKey := prefix + "~"

	it, err := ctx.GetStub().GetStateByRange(prefix, endKey)
	if err != nil {
		return nil, fmt.Errorf("range query: %w", err)
	}
	defer it.Close()

	var out []*FileMetadata
	for it.HasNext() {
		kv, err := it.Next()
		if err != nil {
			return nil, err
		}

		var meta FileMetadata
		if err := json.Unmarshal(kv.Value, &meta); err != nil {
			return nil, fmt.Errorf("unmarshal metadata: %w", err)
		}
		// Filter out entries caller cannot read
		if err := s.assertCanReadFile(ctx, &meta); err == nil {
			copyMeta := meta
			out = append(out, &copyMeta)
		}
	}
	return out, nil
}

func (s *SmartContract) GrantReadAccessToMSP(ctx contractapi.TransactionContextInterface, folderPath string, name string, mspID string) (*FileMetadata, error) {
	mspID = strings.TrimSpace(mspID)
	if mspID == "" {
		return nil, fmt.Errorf("mspID is required")
	}
	k, err := fileKey(folderPath, name)
	if err != nil {
		return nil, err
	}

	stub := ctx.GetStub()
	b, err := stub.GetState(k)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, fmt.Errorf("file not found")
	}

	var meta FileMetadata
	if err := json.Unmarshal(b, &meta); err != nil {
		return nil, err
	}

	callerMSP, callerID, err := s.caller(ctx)
	if err != nil {
		return nil, err
	}
	if meta.OwnerMSP != callerMSP || meta.OwnerID != callerID {
		return nil, errors.New("only owner can grant access")
	}

	if !containsString(meta.ACL.AllowedMSPs, mspID) {
		meta.ACL.AllowedMSPs = append(meta.ACL.AllowedMSPs, mspID)
		meta.UpdatedAt = nowRFC3339()
	}

	updated, err := json.Marshal(&meta)
	if err != nil {
		return nil, err
	}
	if err := stub.PutState(k, updated); err != nil {
		return nil, err
	}
	return &meta, nil
}

func (s *SmartContract) RevokeReadAccessFromMSP(ctx contractapi.TransactionContextInterface, folderPath string, name string, mspID string) (*FileMetadata, error) {
	mspID = strings.TrimSpace(mspID)
	if mspID == "" {
		return nil, fmt.Errorf("mspID is required")
	}
	k, err := fileKey(folderPath, name)
	if err != nil {
		return nil, err
	}

	stub := ctx.GetStub()
	b, err := stub.GetState(k)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, fmt.Errorf("file not found")
	}

	var meta FileMetadata
	if err := json.Unmarshal(b, &meta); err != nil {
		return nil, err
	}

	callerMSP, callerID, err := s.caller(ctx)
	if err != nil {
		return nil, err
	}
	if meta.OwnerMSP != callerMSP || meta.OwnerID != callerID {
		return nil, errors.New("only owner can revoke access")
	}

	if mspID == meta.OwnerMSP {
		return nil, errors.New("cannot revoke owner MSP")
	}

	next := meta.ACL.AllowedMSPs[:0]
	for _, v := range meta.ACL.AllowedMSPs {
		if v != mspID {
			next = append(next, v)
		}
	}
	meta.ACL.AllowedMSPs = next
	meta.UpdatedAt = nowRFC3339()

	updated, err := json.Marshal(&meta)
	if err != nil {
		return nil, err
	}
	if err := stub.PutState(k, updated); err != nil {
		return nil, err
	}
	return &meta, nil
}

