const net = require('net')
const { fork } = require('child_process')
const binary = require('./binaryConverter')
const EventEmitter = require('events')

const response = {
    sessionRegister: 0x65,
    sendRRData: 0x6f,
    listServices: 0x04,
}

/**
 *
 */
class LogixListener extends EventEmitter{
    constructor(){
        super()
        this.server = net.createServer((socket) => {
            socket.on('data', (data) => {

                console.log(data)

                /**
                 * plc sending ListServices request with 0x04 in first byte
                 * not required in all processors
                 * from CIP Network Library Vol 2 section 2-4.6
                 */
                if (data[0] === response.listServices){

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
                if (data[0] === response.sessionRegister) {

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
                if (data[0] === response.sendRRData) {

                    console.log(data.slice(0, 44))
                    console.log(data.slice(44))


                    let arr = [...data]

                    arr[2] = 0x14

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
                    const forked = fork('./LogixMessageHandler.js')
                    forked.send({writeRequest: writeRequest, address: socket.remoteAddress, port: socket.remotePort})
                }

            })

            socket.on('error', (err) => {
                this.emit('mofo', err)
            })



        })


    }

}


module.exports = {LogixListener}

