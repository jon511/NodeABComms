
let net = require('net')
const EIP = require('./EIP')
const EventEmitter = require('events')
const binary = require('./binaryConverter')


class LogixController extends EventEmitter{

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
        this.autoConnect = false

        this.structIdentifier = []

        this.activeTagList = []

        this.connection.on('error', (err)=>{
            this.emit('error', err, this)
        })

        this.connection.on('data', (data) => {

            console.log(data)

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
                // let tag = new LogixTag("rate")
                //
                // this.connection.write(this.readTag(tag.name))


            }
            if (arr[0] === 0x70){

                console.log(data.slice(0, 40))
                console.log(data.slice(40))

                let pointer = 0
                for (let i in arr){
                    if (arr[i] === 0xcc){
                        pointer = i
                        break
                    }
                    /**
                     * return of 0xd2 = Read Tag Fragmented Service (Reply)
                     * see Publication 1756-PM020A-EN-P - October 2009 Logix5000 Data Access page 19
                     */
                    if (arr[i] === 0xd2) {

                    }
                }

                let result = arr.slice(pointer - 2)
                this.emit('readComplete', result)
            }

        })

        this.connection.on('end', ()=>{
            this.isConnected = false
        })

        this.connection.on('timeout', () => {
            this.emit('timeout')
        })

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


    writeTag(tag){
        tag.write()
    }

}

function parseReturn(data){

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
