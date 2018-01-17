
let net = require('net')
const EIP = require('./EIP')
const EventEmitter = require('events')
const binary = require('./binaryConverter')
const {LogixTag, DataType} = require('./LogixTag')


class LogixController extends EventEmitter{

    constructor(ipAddress){
        super()
        this.ipAddress = ipAddress
        this.port = 44818
        this.micro800 = false
        this.processorSlot = 0
        this.vendorID = [0x37, 0x13]
        this.context = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
        this.contextPointer = 0
        this.connection = net.Socket()
        this.connectionBusy = false
        this.setTimeout = 0.0
        this.isConnected = false
        this.otNetworkConnectionID = [0x00, 0x00, 0x00, 0x00]
        this.sessionHandle = [0x00, 0x00, 0x00, 0x00]
        this.sessionIsRegistered = false
        this.serialNumber = binary.ConvertIntTo2BytesLittleEndian(Math.floor(Math.random() * Math.floor(63000)))
        this.originatorSerialNumber = [0x42, 0x00, 0x00, 0x00]
        this.sequenceCounter = 1
        this.offset = 0
        this.readRequestList = []
        this.activeReadTag = undefined

        this.connection.on('error', (err)=>{
            this.emit('error', err, this)
        })

        this.connection.on('data', (data) => {

            let arr = [...data]
            if (arr[0] === 0x65){
                this.sessionHandle = arr.slice(4,8)
                EIP.ForwardOpenPacket(this)
                this.connection.write(EIP.ForwardOpenPacket(this))

            }
            if (arr[0] === 0x6f){
                this.isConnected = true
                // this.otNetworkConnectionID = arr.slice(44,48)
                this.otNetworkConnectionID[0] = arr[44]
                this.otNetworkConnectionID[1] = arr[45]
                this.otNetworkConnectionID[2] = arr[46]
                this.otNetworkConnectionID[3] = arr[47]

                this.isConnected = true
                this.emit('connected')

            }
            if (arr[0] === 0x70){
                console.log(new Buffer(arr.slice(20)))
                let pointer = 0
                let action = ""
                for (let i in arr){

                    /**
                     * return of 0xcc = Read Tag Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 18
                     */
                    if (arr[i] === replyService.ReadTagService){
                        const result = arr.slice(i)
                        action = 'read'
                        if (result[2] !== 0){
                            //error code return, write error to tag and break
                            this.activeReadTag.errorCode = result[2]
                            this.activeReadTag.errorString = errorCodes[this.activeReadTag.errorCode]
                            this.activeReadTag.status = -1
                            this.activeReadTag.emit('error', `Error ${this.activeReadTag.errorCode}: ${this.activeReadTag.errorString}`)
                            break
                        }

                        this.activeReadTag.value = this.parseReadReturn(result.slice(4))
                        //add datatype
                        this.activeReadTag.status = 1
                        this.activeReadTag.emit('readComplete')
                        this.activeReadTag.errorCode = 0
                        this.activeReadTag.errorString = ""
                        break
                    }

                    /**
                     * return of 0xd2 = Read Tag Fragmented Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 19
                     */
                    if (arr[i] === replyService.ReadTagFragmentedService) {
                        pointer = i
                        action = 'frag-read'
                        break
                    }

                    /**
                     * return of 0xcd = Write Tag Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 22
                     */
                    if (arr[i] === replyService.WriteTagService){
                        const result = arr.slice(i)
                        if (result[2] !== 0){
                            //error code return, write error to tag and break
                            this.activeReadTag.errorCode = result[2]
                            this.activeReadTag.errorString = errorCodes[this.activeReadTag.errorCode]
                            this.activeReadTag.status = -1
                            this.activeReadTag.emit('error', `Error ${this.activeReadTag.errorCode}: ${this.activeReadTag.errorString}`)
                            break
                        }

                        this.activeReadTag.status = 1

                        action = 'write'
                        this.activeReadTag.emit('writeComplete')
                        this.activeReadTag.errorCode = 0
                        this.activeReadTag.errorString = ""
                        break
                    }

                    /**
                     * return of 0xd3 = Write Tag Fragmented Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 24
                     */
                    if (arr[i] === replyService.WriteTagFragmentedService){
                        pointer = i
                        action = 'frag-write'
                        break
                    }

                    /**
                     * return of 0xc3 = Read Modify Write Tag Server (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 28
                     */
                    if (arr[i] === replyService.ReadModifyWriteTagService){
                        pointer = i
                        action = 'modify'
                        break
                    }

                    /**
                     * return of 0x8a = Multiple Service Packet Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 30
                     */
                    if (arr[i] === replyService.MultipleServicePacketService){
                        pointer = i
                        action = 'multi-service'
                        break
                    }

                }
                // this.emit('readComplete')
                this.activeReadTag = undefined
                this.connectionBusy = false
                console.log(action)
            }

        })

        this.connection.on('end', ()=>{
            this.isConnected = false
        })

        this.connection.on('timeout', () => {
            this.emit('timeout')
        })

        // this.on('readRequestAdded', () => {
        //     let rr = this.readBuffer.shift()
        //     this.connectionBusy = true
        //     this.connection.write(rr.writeData)
        // })


    }

    connect(){
        this.connection.connect(this.port, this.ipAddress, ()=>{

            this.connection.write(EIP.BuildRegisterSession(this))
            // this.connection.write(this.buildRegisterSession())
        })


    }

    readTag(tag){

        tag.read()
    }

    addSendRequest(sendReq){
        this.readRequestList.push(sendReq)
        this.sendReadRequest()
    }

    sendReadRequest(){
        
        if (this.readRequestList.length === 0){ return }

        if (!this.connectionBusy){
            let rr = this.readRequestList.shift()
            this.activeReadTag = rr.tag
            this.connectionBusy = true
            this.connection.write(rr.writeData)
        }else{
            if (this.readRequestList.length > 0){

                setImmediate(()=>{ this.sendReadRequest() })
            }


        }

    }


    writeTag(tag){
        tag.write()
    }

    parseReadReturn(data){

        switch (data[0]){
            case DataType.SINT:
                return data[2]
                break
            case DataType.INT:
                return binary.ConvertTwoBytesLittleEndianToInt(data.slice(2))
                break
            case DataType.DINT:
                return binary.ConvertFourBytesLittleEndianToInt(data.slice(2))

                break
            case DataType.REAL:
                const floatVal = binary.ConvertFourBytesLittleEndianToInt(data.slice(2))
                return binary.ConvertHexToFloatingPoint(floatVal)
                break
            case DataType.DWORD:
                //add conversion of dword
                break
            case DataType.LINT:
                return binary.ConvertEightBytesLittleEndianToInt(data.slice(2))
                break

        }
    }

}


const replyService = {
    ReadTagService: 0xcc,
    ReadTagFragmentedService: 0xd2,
    WriteTagService: 0xcd,
    WriteTagFragmentedService: 0xd3,
    ReadModifyWriteTagService: 0xce,
    MultipleServicePacketService: 0x8a,
}

const errorCodes = {
    0x04: 'A syntax error was detected decoding the Request Path.',
    0x05: 'Request Path destination unknown: Probably instance number is not present.',
    0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data.',
    0x13: 'Insufficient Request Data: Data too short for expected parameters.',
    0x26: 'General Error: Access beyond end of the object.',
    0xff: {0x2105: 'General Error: Access beyond end of the object.', }
}


module.exports = { LogixController }
