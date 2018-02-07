const net = require('net')
const { fork } = require('child_process')
const binary = require('./binaryConverter')
const { LogixTag, DataType } = require('./LogixTag')
const emitter = require('./EventHandler')

const response = {
    sessionRegister: 0x65,
    sendRRData: 0x6f,
    listServices: 0x04,
}

/**
 *listens for messages sent from plc using Ethernet/IP protocol
 * used for all controllogix and compactlogix plcs
 */
class LogixListener{
    constructor(){
        this.server = net.createServer((socket) => {
            socket.on('data', (data) => {

                const eipRequest = data[0]

                /**
                 * plc sending ListServices request with 0x04 in first byte
                 * not required in all processors
                 * from CIP Network Library Vol 2 section 2-4.6
                 */
                if (eipRequest === response.listServices){

                    let receiveArr = [...data]
                    receiveArr[2] = 26
                    const responseArr = [0x01, 0x00, 0x00, 0x01, 0x14, 0x00, 0x01, 0x00, 0x20, 0x00]

                    const nameOfService = [0x43, 0x6f, 0x6d, 0x6d, 0x75, 0x6e, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x73, 0x00, 0x00]

                    let arr = receiveArr.concat(responseArr, nameOfService)

                    socket.write(new Buffer(arr))
                }


                /**
                 * plc is requesting register session with 0x65 in first byte
                 * from CIP Network Library Vol 2 section 2-4.4
                 * generate a 4 byte session handle and return to requesting device in words 4-7.
                 * the rest of the return is echoing back what is received.
                 */
                if (eipRequest === response.sessionRegister) {

                    const sessionHandle = binary.ConvertIntTo4BytesLittleEndian(Math.floor((Math.random() * 63000) + 1))

                    data[4] = sessionHandle[0]
                    data[5] = sessionHandle[1]
                    data[6] = sessionHandle[2]
                    data[7] = sessionHandle[3]

                    socket.write(data)
                }


                /**
                 * plc sending SendRRData Request with 0x6f in first byte
                 * from CIP Network Library Vol 2 section 2-4.7
                 * acknowledge response is echoing the first 44 words of the request, changing word 2 to value of 0x14
                 * values for words 38 - 43 must be changed before sending the response
                 * word 48 is the length of the complete write request
                 * word 50 begins the write request Publication 1756-PM020A-EN-P Logix5000 DAta Access page 22
                 */
                if (eipRequest === response.sendRRData) {

                    let arr = [...data]

                    arr[2] = 0x14
                    arr[3] = 0x00

                    arr[38] = 0x04
                    arr[39] = 0x00
                    arr[40] = 0xcd
                    arr[41] = 0x00
                    arr[42] = 0x00
                    arr[43] = 0x00

                    //send response
                    socket.write(new Buffer(arr.slice(0,44)))

                    const writeRequestLength = arr[48]
                    const writeRequest = arr.slice(50, 50 + writeRequestLength)


                    //start new process and send the write request data to the new process
                    /**
                     * fork new process to handle the data sent from plc
                     * return data is sent to new process along with the address and port
                     * of the plc
                     */
                    const result = parseIncomingData({writeRequest: writeRequest, address: socket.remoteAddress})
                    const forked = fork('./LogixMessageHandler.js')
                    forked.send(result)
                }

            })

            socket.on('error', (err) => {
                emitter.emit('error', err)
            })


        })

        this.server.on('listening', () => {
            console.log('listening')
            console.log(this.server.address())
        })


    }

    listen() {
        this.server.listen()

    }

}

function parseIncomingData(incomingData){

    const tagNameLength = incomingData.writeRequest[3]
    const tagNameArr = incomingData.writeRequest.slice(4, 4 + tagNameLength)

    let result = {
        senderAddress: incomingData.address,
        tag: new LogixTag('tagName', DataType.DINT)
    }

    result.tag.name = new Buffer(tagNameArr).toString()

    const len = incomingData.writeRequest[1]
    const dataTypePosition = (len * 2) + 2
    const dataType = incomingData.writeRequest[dataTypePosition]

    if (dataType === 0xa0){

        const extDataType = incomingData.writeRequest.slice(dataTypePosition,dataTypePosition + 4)

        if (extDataType[0] === 0xa0 && extDataType[1] === 0x02 && extDataType[2] === 0xce && extDataType[3] === 0x0f ||
            extDataType[0] === 0xa0 && extDataType[1] === 0x02 && extDataType[2] === 0xdb && extDataType[3] === 0x63){

            result.tag.dataType = DataType.STRING

            const dataArr = [incomingData.writeRequest[dataTypePosition], incomingData.writeRequest[dataTypePosition + 1], incomingData.writeRequest[dataTypePosition + 2], incomingData.writeRequest[dataTypePosition + 3]]

            let stringLengthPointer = dataTypePosition + 6
            let sl = [incomingData.writeRequest[stringLengthPointer], incomingData.writeRequest[stringLengthPointer + 1], incomingData.writeRequest[stringLengthPointer + 2], incomingData.writeRequest[stringLengthPointer + 3]]
            let stringLength = ((sl[3] << 24) + (sl[2] << 16) + (sl[1] << 8) + sl[0])

            let str = ""
            for (let i = stringLengthPointer + 4; i < stringLengthPointer + 4 + stringLength; i++){
                str += String.fromCharCode(incomingData.writeRequest[i])
            }

            result.tag.value(str)
            result.tag.length = 1
            result.tag.status = 1
        }
    }else{

        const dataSize = getDataSize(dataType)
        const dataLength = incomingData.writeRequest[dataTypePosition + 2]
        const dataValues = incomingData.writeRequest.slice(dataTypePosition + 4, dataTypePosition + 4 + (dataLength * dataSize))

        let parsedDataValues = []

        for (let i = 0; i < dataValues.length; i ++){

            switch (dataType){

                case 0xc1: //bool
                    result.tag.dataType = DataType.BOOL
                    break
                case 0xc2: //sint
                    result.tag.dataType = DataType.SINT
                    parsedDataValues.push(dataValues[i])
                    break
                case 0xc3: //int
                    if (i % 2 === 0){
                        parsedDataValues.push(binary.ConvertTwoBytesLittleEndianToInt(dataValues.slice(i, i + 2)))
                    }
                    result.tag.dataType = DataType.INT
                    break
                case 0xc4: //dint
                    if (i % 4 === 0){
                        parsedDataValues.push(binary.ConvertFourBytesLittleEndianToInt(dataValues.slice(i, i + 4)))
                    }
                    result.tag.dataType = DataType.DINT
                    break
                case 0xca: //real
                    if (i % 4 === 0){
                        const floatVal = binary.ConvertFourBytesLittleEndianToInt(dataValues.slice(i, i + 4))
                        parsedDataValues.push(binary.ConvertHexToFloatingPoint(floatVal))
                    }
                    result.tag.dataType = DataType.REAL
                    break
                case 0xd3: //dword
                    result.tag.dataType = DataType.DWORD
                    break
                case 0xc5: //lint
                    if (i % 8 === 0){
                        parsedDataValues.push(binary.ConvertFourBytesLittleEndianToInt(dataValues.slice(i, i + 8)))
                    }
                    result.tag.dataType = DataType.LINT
                    break
            }

        }

        result.tag.value(parsedDataValues)
        result.tag.length = parsedDataValues.length
        result.tag.status = 1
    }

    return result
}

function getDataSize(dataType){

    switch (dataType){
        case 0xc1:
        case 0xc2:
            return 1
        case 0xc3:
            return 2
        case 0xc4:
        case 0xca:
        case 0xd3:
            return 4
        case 0xc5:
            return 8
        case 0xa0:
            return 10
    }
}


module.exports = {LogixListener}

