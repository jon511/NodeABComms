
const {Controller, LogixTag} = require('./controller')
const net = require('net')

function intToBytesLittleEndian(val) {
    bytes = []
    bytes[0] = val & 0x000000ff
    bytes[1] = (val & 0x0000ff00) >> 8
    bytes[2] = (val & 0x00ff0000) >> 16
    bytes[3] = (val & 0x7f000000) >> 24

    return bytes
}

var server = net.createServer(function(socket) {
    console.log(socket.remoteAddress + ":" + socket.remoteMRTCPPort)
    //socket.write('Echo server\r\n');
    // socket.pipe(socket);

    socket.on('data', (data) => {

        if (data[0] === 0x65){
            let arr = [...data]

            let sessonID = [0x66, 0x00, 0x6c, 0x00]

            arr[4] = 0x66
            arr[5] = 0x00
            arr[6] = 0x6c
            arr[7] = 0x00

            console.log(new Buffer(arr))

            socket.write(new Buffer(arr))
        }

        if (data[0] === 0x6f){
            let arr = [...data]

            arr[2] = 0x14

            arr[38] = 0x04
            arr[39] = 0x00
            arr[40] = 0xcd
            arr[41] = 0x00
            arr[42] = 0x00
            arr[43] = 0x00

            let len = arr[48]
            console.log(len)

            let newArr = arr.slice(50, 50 + len)

            const tagLen = newArr[1]

            console.log(tagLen)

            const dataTypeStart = (tagLen * 2) + 2
            console.log(dataTypeStart)
            let dataType = newArr[dataTypeStart]

            let dataLength = newArr[dataTypeStart + 2]

            console.log(dataType)
            console.log(dataLength)

            let dataValues = newArr.slice(dataTypeStart + 4, dataTypeStart + 4 + (dataLength *2))


            let values = []

            for (let i in dataValues) {
                if (i % 2 === 0){
                    values.push((dataValues[i + 1] << 8) + dataValues[i])
                }
            }


            const tagNameArr = newArr.slice(4, 4 + tagLen)
            let tagName = ""
            for (let i in tagNameArr){
                tagName += String.fromCharCode(tagNameArr[i])
            }

            console.log(tagName)
            console.log(values)

            // console.log(newArr)

            // console.log(new Buffer(arr.slice(0,44)))

            socket.write(new Buffer(arr.slice(0,44)))

        }

        socket.on('error', (err) => {
            console.log(err)
        })



        console.log(data)
    })
});

server.listen(44818, '10.50.71.142');



// console.log(intToBytesLittleEndian(287))
// console.log(intToBytesLittleEndian(32767))
// console.log(intToBytesLittleEndian(256))

// let controller = new Controller("10.50.193.55", 44818)
// controller.connect()

// tag = new LogixTag('rate')
//
// tag.read()