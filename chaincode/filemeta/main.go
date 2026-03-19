package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("error creating filemeta chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("error starting filemeta chaincode: %v", err)
	}
}

