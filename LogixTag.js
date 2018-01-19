// const {DataType} = require('./Util')
const EIP = require('./EIP')
const binary = require('./binaryConverter')
const emitter = require('./EventHandler')

class LogixTag{

    constructor(name, dataType){
        this.name = name
        this.dataType = dataType
        this.controller = undefined
        this.status = 0
        this._value = 0
        this.length = 1
        this.errorCode = 0
        this.extErrorcode = 0
        this.errorString = ''
        this.userData = undefined
    }

    set value(val){

        if (this._value !== val){
            this._value = val
            emitter.emit('valueChanged', this)
        }
    }

    get value(){
        return this._value
    }

    get fragmentedWriteSize(){
        switch (this.dataType){
            case DataType.BOOL:
            case DataType.SINT:
                return 476
            case DataType.INT:
                return 100
            case DataType.DINT:
            case DataType.REAL:
            case DataType.DWORD:
                return 50
            case DataType.LINT:
                return 60
        }
    }

    get fragmentedReadSize(){

        switch (this.dataType){
            case DataType.BOOL:
            case DataType.SINT:
                return 490
            case DataType.INT:
                return 244
            case DataType.DINT:
            case DataType.REAL:
            case DataType.DWORD:
                return 122
            case DataType.LINT:
                return 60
        }
    }

    get dataTypeSize(){
        switch (this.dataType){
            case DataType.BOOL:
            case DataType.SINT:
                return 1
            case DataType.INT:
                return 2
            case DataType.DINT:
            case DataType.REAL:
            case DataType.DWORD:
                return 4
            case DataType.LINT:
                return 8
        }
    }

    read(){

        // let count = this.length
        // console.log(this.name)
        // console.log(this.length)
        if (this.controller === undefined){
            emitter.emit('error', 'controller not assigned to tag')
            return 'tag controller not defined'
        }

        if (!this.controller.isConnected){

            emitter.emit('error', 'controller not connected')
            return
        }

        //TODO: verify tag name matches allen bradley tag names

        // let maxMessageSize = 0
        //
        if (this.length > 1){

            for (let i = 0; i < this.length; i++){

                if (i % this.fragmentedReadSize === 0){
                    console.log(i)
                    const data = EIP.Build_EIP_CIP_Header(this.controller, this.createFragmentedReadRequest(i))

                    let reqObject = {
                        tag: this,
                        writeData: data

                    }

                    this.controller.addSendRequest(reqObject)
                }


                // if (i % this.fragmentedReadSize === 0){
                //
                //     const data = EIP.Build_EIP_CIP_Header(this.controller, this.createFragmentedReadRequest(i))
                //
                //     let reqObject = {
                //         tag: this,
                //         writeData: data
                //
                //     }
                //
                //     this.controller.addSendRequest(reqObject)
                // }
            }



        }else{

            const data = EIP.Build_EIP_CIP_Header(this.controller, this.createReadRequest())

            let readReqObject = {
                tag: this,
                writeData: data

            }

            this.controller.addSendRequest(readReqObject)
        }




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

    createFragmentedReadRequest(startPos){

        let requestService = [0x52]
        let requestPath = [0x91, this.name.length]
        for (let c in this.name){
            requestPath.push(this.name.charCodeAt(c))
        }
        if (requestPath.length % 2 !== 0) {
            requestPath.push(0x00)
        }
        let requestPathSize = requestPath.length / 2
        let requestData = binary.ConvertIntTo2BytesLittleEndian(this.length)

        let tempArr = this.value.slice(startPos)
        let endPos = (tempArr.length < this.fragmentedWriteSize) ? tempArr.length : this.fragmentedWriteSize

        let startPosition = binary.ConvertIntTo4BytesLittleEndian(startPos * this.dataTypeSize)
        console.log(startPos)
        return requestService.concat(requestPathSize, requestPath, requestData, startPosition)
    }

    write(){

        if (!this.controller.isConnected){
            console.log('controller not connected')
        }

        //TODO: verification before writing tag


        if (this.length > 1){

            for (let i = 0; i < this.length; i++){
                if (i % this.fragmentedWriteSize === 0){
                    // console.log(i)
                    const data = EIP.Build_EIP_CIP_Header(this.controller, this.createFragmentedWriteRequest(i))
                    // let a = this.createFragmentedWriteRequest(i)
                    // console.log(a.length)
                    let reqObject = {
                        tag: this,
                        writeData: data

                    }

                    this.controller.addSendRequest(reqObject)
                }
            }

        }else{

            const data = EIP.Build_EIP_CIP_Header(this.controller, this.createWriteRequest())

            let requestObject = {
                tag: this,
                writeData: data
            }

            this.controller.addSendRequest(requestObject)
        }




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

    createFragmentedWriteRequest(pos){

        let requestService = [0x53]

        let requestPath = [0x91, this.name.length]
        for (let c in this.name){
            requestPath.push(this.name.charCodeAt(c))
        }
        if (requestPath.length % 2 !== 0) {
            requestPath.push(0x00)
        }

        let requestPathSize = [requestPath.length / 2]

        let requestDataType = binary.ConvertIntTo2BytesLittleEndian(this.dataType)

        let requestDataOffset = binary.ConvertIntTo4BytesLittleEndian(pos * this.dataTypeSize)

        let requestDataElements = binary.ConvertIntTo2BytesLittleEndian(this.length)

        let writeValue = []

        let tempArr = this.value.slice(pos)
        let endPos = (tempArr.length < this.fragmentedWriteSize) ? tempArr.length : this.fragmentedWriteSize

        for (let i = pos; i < pos + endPos; i++){


            switch (this.dataType){
                case DataType.SINT:
                    writeValue = writeValue.concat([this.value[i]])
                    break
                case DataType.INT:
                    writeValue = writeValue.concat(binary.ConvertIntTo2BytesLittleEndian(this.value[i]))
                    break
                case DataType.DINT:
                    writeValue = writeValue.concat(binary.ConvertIntTo4BytesLittleEndian(this.value[i]))
                    break
                case DataType.REAL:
                    //TODO: calculate floating point to byte array
                    break
                case DataType.DWORD:
                    //TODO: calculate dword data type to byte array
                    break
                case DataType.LINT:
                    //TODO: calculate LINT to 8 byte array
                    break

            }

        }

        // console.log(new Buffer(requestService.concat(requestPathSize, requestPath, requestDataType, requestDataElements, requestDataOffset)))
        return requestService.concat(requestPathSize, requestPath, requestDataType, requestDataElements, requestDataOffset, writeValue)
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

