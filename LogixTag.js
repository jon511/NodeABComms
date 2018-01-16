// const {DataType} = require('./Util')
const EIP = require('./EIP')
const binary = require('./binaryConverter')
const EventEmitter = require('events')

let oldValue = undefined

class LogixTag extends EventEmitter{

    constructor(name, dataType){
        super()
        this.name = name
        this.dataType = dataType
        this.controller = undefined
        this.status = 0
        this.value = 0
        this.length = 1
        this.errorCode = 0
        this.errorString = ''
        this.cipSequenceID = 0
    }

    setValue(val){

        if (this.value !== val){
            this.value = val
            this.emit('dataChanged')
        }
    }

    read(){

        if (this.controller === undefined){
            return 'tag controller not defined'
        }

        if (!this.controller.isConnected){
            //TODO: if controller is not connected attempt connection.
        }

        //TODO: verify tag name matches allen bradley tag names


        let data = EIP.Build_EIP_CIP_Header(this.controller, this.createReadRequest())

        this.cipSequenceID = binary.ConvertTwoBytesLittleEndianToInt(data.sequenceID)
        console.log(data.writeData)
        this.controller.connection.write(data.writeData)
        this.controller.activeTagList.push(this)

    }

    createReadRequest(){

        let requestService = [0x4c]
        let requestPath = [0x91, this.name.length]
        for (let c in this.name){
            requestPath.push(this.name.charCodeAt(c))
        }
        if (requestPath.length % 2 !== 0) {
            requestPath.push(0x00)
        }
        let requestPathSize = requestPath.length / 2
        let requestData = [0x01, 0x00]

        return requestService.concat(requestPathSize, requestPath, requestData)

    }

    write(){

        if (!this.controller.isConnected){
            console.log('controller not connected')
        }

        //TODO: verification before writing tag


        let data = EIP.Build_EIP_CIP_Header(this.controller, this.createWriteRequest())

        this.controller.connection.write(data.writeData)
    }

    createWriteRequest(){

        let requestService = [0x4D]

        let requestPath = [0x91, this.name.length]
        for (let c in this.name){
            requestPath.push(this.name.charCodeAt(c))
        }
        if (requestPath.length % 2 !== 0) {
            requestPath.push(0x00)
        }

        let requestPathSize = [requestPath.length / 2]

        let requestDataType = binary.ConvertIntTo2BytesLittleEndian(this.dataType)

        let requestDataElements = binary.ConvertIntTo2BytesLittleEndian(this.length)

        let writeValue = []
        switch (this.dataType){
            case DataType.SINT:
                writeValue = [this.value]
                break
            case DataType.INT:
                writeValue = binary.ConvertIntTo2BytesLittleEndian(this.value)
                break
            case DataType.DINT:
                if (typeof this.value === "number"){
                    writeValue = binary.ConvertIntTo4BytesLittleEndian(this.value)
                }else{
                    for (let i of this.value){
                        writeValue = writeValue.concat(binary.ConvertIntTo4BytesLittleEndian(i))
                    }
                }
                break
            case DataType.REAL:
                break
            case DataType.DWORD:
                break
            case DataType.LINT:
                break

        }

        return requestService.concat(requestPathSize, requestPath, requestDataType, requestDataElements, writeValue)

    }
}

const DataType = {
    BOOL: 0xc1,
    SINT: 0xc2,
    INT: 0xc3,
    DINT: 0xc4,
    REAL: 0xca,
    DWORD: 0xd3,
    LINT: 0xc5,
    STRING: 0xa0,
}

module.exports = {LogixTag, DataType}

