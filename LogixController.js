let net = require('net')
const EIP = require('./EIP')
const EventEmitter = require('events')
const binary = require('./binaryConverter')
const {LogixTag, DataType} = require('./LogixTag')
const emitter = require('./EventHandler')


class LogixController {

    constructor(ipAddress) {

        this.ipAddress = ipAddress
        this.port = 44818
        this.micro800 = false
        this.processorSlot = 0
        this.vendorID = [0x37, 0x13]
        this.context = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
        this.contextPointer = 0
        this.connection = net.Socket()
        this.connectionBusy = false
        this._timeout = 0.0
        this.isConnected = false
        this.otNetworkConnectionID = [0x00, 0x00, 0x00, 0x00]
        this.sessionHandle = [0x00, 0x00, 0x00, 0x00]
        this.sessionIsRegistered = false
        this.serialNumber = binary.ConvertIntTo2BytesLittleEndian(Math.floor(Math.random() * Math.floor(63000)))
        this.originatorSerialNumber = [0x42, 0x00, 0x00, 0x00]
        this.sequenceCounter = 1
        this.offset = 0
        this.readRequestList = []
        this.fragmentedResponse = []
        this.activeReadTag = undefined
        this.activeTagList = undefined

        this.connection.on('error', (err) => {
            emitter.emit('error', err, this)
        })

        this.connection.on('data', (data) => {
            // console.log('on')
            // console.log(data.slice(44))
            let arr = [...data]
            if (arr[0] === 0x65) {
                this.sessionHandle = arr.slice(4, 8)
                EIP.ForwardOpenPacket(this)
                this.connection.write(EIP.ForwardOpenPacket(this))

            }
            if (arr[0] === 0x6f) {
                this.isConnected = true
                // this.otNetworkConnectionID = arr.slice(44,48)
                this.otNetworkConnectionID[0] = arr[44]
                this.otNetworkConnectionID[1] = arr[45]
                this.otNetworkConnectionID[2] = arr[46]
                this.otNetworkConnectionID[3] = arr[47]

                this.isConnected = true
                emitter.emit('connected')

            }
            if (arr[0] === 0x70) {

                // console.log(new Buffer(arr.slice(20)))

                let pointer = 0
                let action = ""

                for (let i in arr) {

                    /**
                     * return of 0xcc = Read Tag Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 18
                     */
                    if (arr[i] === replyService.ReadTagService) {
                        const result = arr.slice(i)
                        action = 'read'
                        if (result[2] !== 0) {
                            //error code return, write error to tag and break
                            this.activeReadTag.errorCode = result[2]
                            this.activeReadTag.extErrorcode = result[3]
                            this.activeReadTag.errorString = errorCodes[this.activeReadTag.errorCode]
                            this.activeReadTag.status = -1
                            emitter.emit('error', `Error ${this.activeReadTag.errorCode}: ${this.activeReadTag.errorString}`)
                            break
                        }

                        this.activeReadTag.value = this.parseReadReturn(result.slice(4))
                        //add datatype
                        this.activeReadTag.status = 1
                        emitter.emit('readComplete', this.activeReadTag)
                        this.activeReadTag.errorCode = 0
                        this.activeReadTag.errorString = ""
                        break
                    }

                    /**
                     * return of 0xd2 = Read Tag Fragmented Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 19
                     */
                    if (arr[i] === replyService.ReadTagFragmentedService) {

                        const result = arr.slice(i)
                        console.log(new Buffer(arr.slice(i)))

                        action = 'read'
                        if (result[2] !== 0 && result[2] !== 6) {
                            //error code return, write error to tag and break
                            this.activeReadTag.errorCode = result[2]
                            this.activeReadTag.extErrorcode = result[3]
                            this.activeReadTag.errorString = errorCodes[this.activeReadTag.errorCode]
                            this.activeReadTag.status = -1
                            emitter.emit('error', `Error code ${this.activeReadTag.errorCode}: Ext error: ${this.activeReadTag.extErrorcode} ${this.activeReadTag.errorString}`)
                            break
                        }


                        if (result[2] === 6) {
                            this.fragmentedResponse = this.fragmentedResponse.concat(this.parseFragmentedReadReturn(result.slice(4)))
                            //add datatype
                            this.activeReadTag.errorCode = 0
                            this.activeReadTag.errorString = ""

                            break
                        }

                        this.fragmentedResponse = this.fragmentedResponse.concat(this.parseFragmentedReadReturn(result.slice(4)))

                        this.activeReadTag.value = this.fragmentedResponse
                        //add datatype
                        this.activeReadTag.status = 1
                        emitter.emit('readComplete', this.activeReadTag)
                        this.activeReadTag.errorCode = 0
                        this.activeReadTag.errorString = ""
                        this.fragmentedResponse = []
                        break

                    }

                    /**
                     * return of 0xcd = Write Tag Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 22
                     */
                    if (arr[i] === replyService.WriteTagService) {
                        const result = arr.slice(i)
                        if (result[2] !== 0) {
                            //error code return, write error to tag and break
                            this.activeReadTag.errorCode = result[2]
                            this.activeReadTag.extErrorcode = result[3]
                            this.activeReadTag.errorString = errorCodes[this.activeReadTag.errorCode]
                            this.activeReadTag.status = -1
                            emitter.emit('error', `Error code ${this.activeReadTag.errorCode}: Ext error: ${this.activeReadTag.extErrorcode} ${this.activeReadTag.errorString}`)
                            break
                        }

                        this.activeReadTag.status = 1

                        emitter.emit('writeComplete', this.activeReadTag)
                        this.activeReadTag.errorCode = 0
                        this.activeReadTag.errorString = ""
                        break
                    }

                    /**
                     * return of 0xd3 = Write Tag Fragmented Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 24
                     */
                    if (arr[i] === replyService.WriteTagFragmentedService) {

                        const result = arr.slice(i)
                        if (result[2] !== 0) {
                            //error code return, write error to tag and break
                            this.activeReadTag.errorCode = result[2]
                            this.activeReadTag.extErrorcode = result[3]
                            this.activeReadTag.errorString = errorCodes[this.activeReadTag.errorCode]
                            this.activeReadTag.status = -1
                            emitter.emit('error', `Error code ${this.activeReadTag.errorCode}: Ext error: ${this.activeReadTag.extErrorcode} ${this.activeReadTag.errorString}`)
                            break
                        }

                        //TODO: need to add way to determine the last write of a fragmented write

                        this.activeReadTag.status = 1

                        emitter.emit('writeComplete', this.activeReadTag)
                        this.activeReadTag.errorCode = 0
                        this.activeReadTag.errorString = ""
                        break
                    }

                    /**
                     * return of 0xc3 = Read Modify Write Tag Server (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 28
                     */
                    if (arr[i] === replyService.ReadModifyWriteTagService) {
                        pointer = i
                        action = 'modify'
                        break
                    }

                    /**
                     * return of 0x8a = Multiple Service Packet Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 30
                     */
                    if (arr[i] === replyService.MultipleServicePacketService) {

                        const result = arr.slice(i)

                        console.log(new Buffer(result))

                        if (result[2] !== 0) {

                            const errorCode = result[2]
                            const error = errorCodes[errorCode]

                            for (let tag of this.activeReadTag){
                                tag.errorString = error
                                tag.errorCode = errorCode
                                tag.status = 0


                            }

                            break
                        }

                        for (let i = 0; i < result.length; i++) {
                            if (result[i] === 0xcc) {
                                const resultPointer = i + 2
                                const dataTypePointer = i + 4

                                const dataSize = DataType[result[dataTypePointer]]

                                this.activeReadTag.value = this.parseReadReturn(result.slice(dataTypePointer, 2 + dataSize))

                                console.log(this.activeReadTag.length)
                                let thisTag = this.activeReadTag.shift()
                                thisTag.value = 'nope'
                                thisTag.status = 1

                                emitter.emit('readComplete', thisTag)
                            }


                            if (result[i] === 0xcd) {
                                console.log('write found')
                                console.log(this.activeReadTag.length)
                                // console.log(this.activeReadTag)

                            }

                        }


                        break
                    }

                }
                // this.emit('readComplete')
                this.activeReadTag = undefined
                this.connectionBusy = false
            }

        })

        this.connection.on('end', () => {
            this.isConnected = false
            emitter.emit('end')
        })

        this.connection.on('timeout', () => {
            emitter.emit('timeout', this)
        })

        this.connection.on('close', () => {
            emitter.emit('close')
        })

        // this.on('readRequestAdded', () => {
        //     let rr = this.readBuffer.shift()
        //     this.connectionBusy = true
        //     this.connection.write(rr.writeData)
        // })


    }

    set timeout(val) {
        this._timeout = val
        this.connection.setTimeout(val)
    }

    get timeout() {
        return this._timeout
    }

    connect() {
        this.connection.connect(this.port, this.ipAddress, () => {

            this.connection.write(EIP.BuildRegisterSession(this))
            // this.connection.write(this.buildRegisterSession())
        })


    }

    readTag(tag) {

        tag.read()
    }

    addSendRequest(sendReq) {
        this.readRequestList.push(sendReq)
        this.sendReadRequest()
    }

    sendReadRequest() {

        if (this.readRequestList.length === 0) {
            return
        }

        if (!this.connectionBusy) {
            let rr = this.readRequestList.shift()
            this.currentReadRequest = rr
            this.activeReadTag = rr.tag
            this.activeTagList = rr.tagList
            this.connectionBusy = true
            this.connection.write(rr.writeData)
            console.log(rr.writeData.slice(44))
        } else {
            if (this.readRequestList.length > 0) {

                setImmediate(() => {
                    this.sendReadRequest()
                })
            }


        }

    }


    writeTag(tag) {
        tag.write()
    }

    parseReadReturn(data) {

        switch (data[0]) {
            case DataType.BOOL:
                return (data[2] === 0) ? false : true
            case DataType.SINT:
                return data[2]
            case DataType.INT:
                return binary.ConvertTwoBytesLittleEndianToInt(data.slice(2))
            case DataType.DINT:
                return binary.ConvertFourBytesLittleEndianToInt(data.slice(2))
            case DataType.REAL:
                const floatVal = binary.ConvertFourBytesLittleEndianToInt(data.slice(2))
                return binary.ConvertHexToFloatingPoint(floatVal)
            case DataType.DWORD:
                const newData = data.slice(2)
                let retData = []
                let tempReturn = []
                for (let i = 0; i < newData.length; i++) {
                    let pointer = i % 4
                    let tempBoolArr = []
                    for (let j = 0; j < 8; j++) {
                        tempBoolArr.push((((newData[i] >> j) & 0x01) === 1) ? true : false)
                    }
                    tempReturn = tempReturn.concat(tempBoolArr)
                    if (pointer === 3) {
                        retData = tempReturn
                        tempReturn = []
                    }

                }
                return retData

            case DataType.LINT:
                return binary.ConvertEightBytesLittleEndianToInt(data.slice(2))

        }
    }

    parseFragmentedReadReturn(data) {

        const newData = data.slice(2)
        let retData = []

        switch (data[0]) {
            case DataType.SINT:

                for (let i = 0; i < newData.length; i++) {
                    retData.push(newData[i])
                }
                return retData

            case DataType.INT:

                for (let i = 0; i < newData.length; i += 2) {
                    retData.push(binary.ConvertTwoBytesLittleEndianToInt(newData.slice(i, i + 2)))
                }
                return retData

            case DataType.DINT:

                for (let i = 0; i < newData.length; i += 4) {
                    retData.push(binary.ConvertFourBytesLittleEndianToInt(newData.slice(i, i + 4)))
                }
                return retData

            case DataType.REAL:

                for (let i = 0; i < newData.length; i += 4) {
                    let floatVal = binary.ConvertFourBytesLittleEndianToInt(newData.slice(i, i + 4))
                    retData.push(binary.ConvertHexToFloatingPoint(floatVal).toFixed(3))

                }

                return retData

            case DataType.DWORD:

                let tempReturn = []
                for (let i = 0; i < newData.length; i++) {
                    let pointer = i % 4
                    let tempBoolArr = []
                    for (let j = 0; j < 8; j++) {
                        tempBoolArr.push((((newData[i] >> j) & 0x01) === 1) ? true : false)
                    }
                    tempReturn = tempReturn.concat(tempBoolArr)
                    if (pointer === 3) {
                        retData.push(tempReturn)
                        tempReturn = []
                    }

                }
                return retData

            case DataType.LINT:

                for (let i = 0; i < newData.length; i += 8) {
                    // console.log(new Buffer(newData.slice(i, i+8)))
                    retData.push(binary.ConvertFourBytesLittleEndianToInt(newData.slice(i, i + 8)))
                }
                return retData

        }
    }

    dataTypeSize(type){
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

}


const replyService = {
    ReadTagService: 0xcc,
    ReadTagFragmentedService: 0xd2,
    WriteTagService: 0xcd,
    WriteTagFragmentedService: 0xd3,
    ReadModifyWriteTagService: 0xce,
    MultipleServicePacketService: 0x8a,
}

// const errorCodes = {
//     0x04: 'A syntax error was detected decoding the Request Path.',
//     0x05: 'Request Path destination unknown: Probably instance number is not present.',
//     0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data.',
//     0x13: 'Insufficient Request Data: Data too short for expected parameters.',
//     0x26: 'General Error: Access beyond end of the object.',
//     0xff: {0x2105: 'General Error: Access beyond end of the object.',}
// }

const errorCodes = {
    0x00: 'Success',
    0x01: 'Connection failure',
    0x02: 'Resource unavailable',
    0x03: 'Invalid parameter value',
    0x04: 'Path segment error',
    0x05: 'Path destination unknown',
    0x06: 'Partial transfer',
    0x07: 'Connection lost',
    0x08: 'Service not supported',
    0x09: 'Invalid Attribute',
    0x0A: 'Attribute list error',
    0x0B: 'Already in requested mode/state',
    0x0C: 'Object state conflict',
    0x0D: 'Object already exists',
    0x0E: 'Attribute not settable',
    0x0F: 'Privilege violation',
    0x10: 'Device state conflict',
    0x11: 'Reply data too large',
    0x12: 'Fragmentation of a premitive value',
    0x13: 'Not enough data',
    0x14: 'Attribute not supported',
    0x15: 'Too much data',
    0x16: 'Object does not exist',
    0x17: 'Service fragmentation sequence not in progress',
    0x18: 'No stored attribute data',
    0x19: 'Store operation failure',
    0x1A: 'Routing failure, request packet too large',
    0x1B: 'Routing failure, response packet too large',
    0x1C: 'Missing attribute list entry data',
    0x1D: 'Invalid attribute value list',
    0x1E: 'Embedded service error',
    0x1F: 'Vendor specific',
    0x20: 'Invalid Parameter',
    0x21: 'Write once value or medium already written',
    0x22: 'Invalid reply received',
    0x23: 'Buffer overflow',
    0x24: 'Invalid message format',
    0x25: 'Key failure in path',
    0x26: 'Path size invalid',
    0x27: 'Unexpected attribute in list',
    0x28: 'Invalid member ID',
    0x29: 'Member not settable',
    0x2A: 'Group 2 only server general failure',
    0x2B: 'Unknown Modbus error',
    0x2C: 'Attribute not gettable',
}


module.exports = {LogixController}
