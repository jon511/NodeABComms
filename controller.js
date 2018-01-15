
let net = require('net')
const EventEmitter = require('events')
const binary = require('./binaryConverter')


class Controller extends EventEmitter{

    constructor(ipAddress, port){
        super()
        this.ipAddress = ipAddress
        this.port = port
        this.micro800 = false
        this.processorSlot = 0
        this.vendorID = [0x37, 0x13]
        this.context = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
        this.contextPointer = 0
        this.connection = net.Socket()
        this.setTimeout = 0.0
        this.isConnected = false
        this.otNetworkConnectionID = [0x00, 0x00, 0x00, 0x00]
        this.sessionHandle = [0x00, 0x00, 0x00, 0x00]
        this.sessionIsRegistered = false
        this.serialNumber = binary.ConvertIntTo2BytesLittleEndian(Math.floor(Math.random() * Math.floor(63000)))
        this.originatorSerialNumber = [0x42, 0x00, 0x00, 0x00]
        this.sequenceCounter = 1
        this.offset = 0

        this.structIdentifier = []

        this.activeTagList = []

        this.respCounter = 0

        this.connection.on('error', (err)=>{
            console.log(err)
        })

        this.connection.on('data', (data) => {
            let arr = [...data]
            if (arr[0] === 0x65){
                this.sessionHandle = arr.slice(4,8)

                this.connection.write(this.forwardOpenPacket())

            }
            if (arr[0] === 0x6f && this.respCounter == 1){
                this.isConnected = true
                // this.otNetworkConnectionID = arr.slice(44,48)
                this.otNetworkConnectionID[0] = arr[44]
                this.otNetworkConnectionID[1] = arr[45]
                this.otNetworkConnectionID[2] = arr[46]
                this.otNetworkConnectionID[3] = arr[47]

                this.isConnected = true
                this.emit('connected')
                // let tag = new LogixTag("rate")
                //
                // this.connection.write(this.readTag(tag.name))


            }
            if (arr[0] === 0x70){
                console.log(data)
                console.log(data.slice(data.length / 2))
                let pointer = 0
                for (let i in arr){
                    if (arr[i] === 0xcc){
                        pointer = i
                        break
                    }
                }
                // console.log(pointer)
                let result = arr.slice(pointer)
                // console.log('result')
                
                // console.log(binary.ConvertFourBytesLittleEndianToInt(result.slice(6)))
                this.emit('readComplete', result)
                // console.log(new Buffer(result))
                // console.log(new Buffer(arr))
                // console.log(new Buffer(arr.slice(44)))
            }
            // console.log(data)
            console.log(this.respCounter)
            this.respCounter ++
        })

        this.connection.on('end', ()=>{
            this.isConnected = false
        })

        this.connection.on('timeout', () => {
            console.log('timeout')
        })

    }



    listen(){
        this.connection.listen()
    }

    connect(){
        this.connection.connect(this.port, this.ipAddress, ()=>{

            this.connection.write(this.buildRegisterSession())
        })


    }

    buildRegisterSession(){

        //
        let eipCommand = [0x65, 0x00]
        let eipLength = [0x04, 0x00]
        let eipSessionHandle = this.sessionHandle
        let eipStatus = [0x00, 0x00, 0x00, 0x00]
        let eipContext = this.context
        let eipOptons = [0x00, 0x00, 0x00, 0x00]
        let eipProtocolVersion = [0x01, 0x00]
        let eipOptionFlag = [0x00, 0x00]

        return new Buffer(eipCommand.concat(eipLength, eipSessionHandle, eipStatus, eipContext, eipOptons, eipProtocolVersion, eipOptionFlag))
    }

    forwardOpenPacket(){

        let fwdOpen = this.buildCIPForwardOpen()
        let rrDataHeader = this.buildEIPSendDataHeader(fwdOpen.length)

        return new Buffer(rrDataHeader.concat(fwdOpen))
    }

    buildCIPForwardOpen(){

        let cipService = [0x54]
        let cipPathSize = [0x02]
        let cipClassType = [0x20]
        let cipClass = [0x06]
        let cipInstanceType = [0x24]
        let cipInstance = [0x01]
        let cipPriority = [0x0a]
        let cipTimeoutTicks = [0x0e]

        let cipHead = cipService.concat(cipPathSize, cipClassType, cipClass, cipInstanceType, cipInstance, cipPriority, cipTimeoutTicks)

        let cipOTConnectionID = [0x02, 0x00, 0x00, 0x20]
        let cipTOConnectionID = [0x01, 0x00, 0x00, 0x20]
        let cipConnectionSerialNumber = this.serialNumber
        let cipVendorID = this.vendorID
        let cipOriginatorSerialNumber = this.originatorSerialNumber
        let cipMultiplier = [0x03, 0x00, 0x00, 0x00]
        let cipOTRpi = [0x34, 0x12, 0x20, 0x00]
        let cipOTNetworkConnectionParameters = [0xf4, 0x43]
        let cipToRpi = [0x01, 0x40, 0x20, 0x00]
        let cipTONetworkConnectionParameters = [0xf4, 0x43]

        let cipTransportTrigger = [0xa3]

        let data = cipHead.concat(cipOTConnectionID, cipTOConnectionID, cipConnectionSerialNumber, cipVendorID, cipOriginatorSerialNumber, cipMultiplier, cipOTRpi, cipOTNetworkConnectionParameters, cipToRpi, cipTONetworkConnectionParameters, cipTransportTrigger)

        let connectionPath = []

        if (this.micro800){
            connectionPath = [0x20, 0x02, 0x24, 0x01]
        }else {
            connectionPath = [0x01, this.processorSlot, 0x20, 0x02, 0x24, 0x01]
        }

        let cPathSize = connectionPath.length / 2

        return data.concat(cPathSize, connectionPath)
    }

    buildEIPSendDataHeader(frameLen){
        let eipCommand = [0x6f, 0x00]
        let eipLength = binary.ConvertIntTo2BytesLittleEndian(16 + frameLen)
        let eipSessionHandle = this.sessionHandle
        let eipStatus = [0x00, 0x00, 0x00, 0x00]
        let eipContext = this.context
        let eipOptions = [0x00, 0x00, 0x00, 0x00]
        let eipInterfaceHandle = [0x00, 0x00, 0x00, 0x00]
        let eipTimeout = [0x00, 0x00]
        let eipItemCount = [0x02, 0x00]
        let eipItem1Type = [0x00, 0x00]
        let eipItem1Length = [0x00, 0x00]
        let eipItem2Type = [0xb2, 0x00]
        let eipItem2Length = binary.ConvertIntTo2BytesLittleEndian(frameLen)

        return eipCommand.concat(eipLength, eipSessionHandle, eipStatus, eipContext, eipOptions, eipInterfaceHandle, eipTimeout, eipItemCount, eipItem1Type, eipItem1Length, eipItem2Type, eipItem2Length)
    }

    build_EIP_CIP_Header(tagIOI){

        if (this.contextPointer === 155) {
            this.contextPointer = 0
        }

        let eipConnectedDataLength = tagIOI.length + 2

        let eipCommand = [0x70, 0x00]
        let eipLength = binary.ConvertIntTo2BytesLittleEndian(22 + tagIOI.length)

        let eipSessionHandle = this.sessionHandle
        let eipStatus = [0x00, 0x00, 0x00, 0x00]

        let eipContext = contextObject[this.contextPointer]
        this.contextPointer ++
        console.log(this.contextPointer)

        let eipOptions = [0x00, 0x00, 0x00, 0x00]
        let eipInterfaceHandle = [0x00, 0x00, 0x00, 0x00]
        let eipTimeout = [0x00, 0x00]
        let eipItemCount = [0x02, 0x00]
        let eipItem1ID = [0xa1, 0x00]
        let eipItem1Length = [0x04, 0x00]
        let eipItem1 = this.otNetworkConnectionID
        let eipItem2ID = [0xb1, 0x00]
        let eipItem2Length = [eipConnectedDataLength, 0x00]

        let eipSequence = binary.ConvertIntTo2BytesLittleEndian(this.sequenceCounter)
        console.log(`eip sequence ${eipSequence}`)
        this.sequenceCounter ++
        this.sequenceCounter = this.sequenceCounter % 0x10000

        let eipHeaderFrame = eipCommand.concat(eipLength, eipSessionHandle, eipStatus, eipContext, eipOptions, eipInterfaceHandle, eipTimeout, eipItemCount, eipItem1ID, eipItem1Length,eipItem1, eipItem2ID, eipItem2Length, eipSequence)

        return new Buffer(eipHeaderFrame.concat(tagIOI))
    }

    readTag(tagName){

        let requestService = [0x4c]
        let requestPath = [0x91, tagName.length]
        for (let c in tagName){
            requestPath.push(tagName.charCodeAt(c))
        }
        if (requestPath.length % 2 !== 0) {
            requestPath.push(0x00)
        }
        let requestPathSize = [requestPath.length / 2]
        let requestData = [0x01, 0x00]

        let sendData = requestService.concat(requestPathSize, requestPath, requestData)
        this.contextPointer = 0
        let data = this.build_EIP_CIP_Header(sendData)
        // return data
        this.connection.write(data)
    }


    writeTag(intag, value){

        try{
            throw "controller not assigned"
        }
        catch (e){
            console.log(e)
        }

        console.log('write')
        console.log(intag.dataType)
        //TODO add error checking before
        // attempting to write tag

        let writeValue = []
        console.log(`s t dt ${intag.dataType}`)
        console.log(typeof intag.dataType)
        console.log(typeof DataType.DINT)
        if (intag.dataType == DataType.DINT){
            writeValue = binary.ConvertIntTo4BytesLittleEndian(value)
        }

        switch (intag.dataType){
            case DataType.BOOL:
                intag.dataType = DataType.BOOL
                break
            case DataType.SINT:
                intag.dataType = DataType.SINT
                break
            case DataType.INT:
                intag.dataType = DataType.INT
                break
            case 0xc4:
                console.log('ggg')
                writeValue = binary.ConvertIntTo4BytesLittleEndian(value)
                break
            case DataType.REAL:
                // writeValue = binary.

                break
            case DataType.DWORD:
                intag.dataType = DataType.DWORD
                break
            case DataType.LINT:
                intag.dataType = DataType.LINT
                break

        }

        writeValue = binary.ConvertIntTo4BytesLittleEndian(value)

        let tagName = 'rate'

        let requestService = [0x4D]

        let requestPath = [0x91, tagName.length]
        for (let c in tagName){
            requestPath.push(tagName.charCodeAt(c))
        }
        if (requestPath.length % 2 !== 0) {
            requestPath.push(0x00)
        }

        let requestPathSize = [requestPath.length / 2]

        // let requestDataType = [intag.dataType, 0x00]
        let requestDataType = [0xc4, 0x00]
        console.log(`request data type ${requestDataType}`)
        let requestDataElements = [0x01, 0x00]
        let requestDataValue = writeValue

        let sendData = requestService.concat(requestPathSize, requestPath, requestDataType, requestDataElements, requestDataValue)

        let data = this.build_EIP_CIP_Header(sendData)
        console.log(new Buffer(data))
        this.connection.write(new Buffer(data))
    }

}

const DataType = {
    BOOL: 0xc1,
    SINT: 0xc2,
    INT: 0xc3,
    DINT: 0xc4,
    REAL: 0xca,
    DWORD: 0xd3,
    LINT: 0xc5
}


module.exports = {Controller, DataType}
