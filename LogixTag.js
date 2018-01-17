// const {DataType} = require('./Util')
const EIP = require('./EIP')
const binary = require('./binaryConverter')
const EventEmitter = require('events')

class LogixTag extends EventEmitter{

    constructor(name, dataType){
        super()
        this.name = name
        this.dataType = dataType
        this.controller = undefined
        this.status = 0
        this._value = 0
        this.length = 1
        this.errorCode = 0
        this.errorString = ''
    }

    set value(val){

        if (this._value !== val){
            this._value = val
            this.emit('valueChanged')
        }
    }

    get value(){
        return this._value
    }

    read(){

        if (this.controller === undefined){
            this.emit('error', 'controller not assigned to tag')
            return 'tag controller not defined'
        }

        if (!this.controller.isConnected){

            this.emit('error', 'controller not connected')
            return
        }

        // if (this.controller.activeReadTag !== undefined){
        //     console.log('read busy')
        //     return
        // }

        //TODO: verify tag name matches allen bradley tag names


        const data = EIP.Build_EIP_CIP_Header(this.controller, this.createReadRequest())

        let readReqObject = {
            tag: this,
            writeData: data
        }

        this.controller.addSendRequest(readReqObject)

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


        const data = EIP.Build_EIP_CIP_Header(this.controller, this.createWriteRequest())
        console.log(data.slice(data.length - 4))
        let requestObject = {
            tag: this,
            writeData: data
        }
        this.controller.addSendRequest(requestObject)
        // this.controller.connection.write(data.writeData)
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

