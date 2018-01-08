
const {Controller, LogixTag} = require('./controller')

function intToBytesLittleEndian(val) {
    bytes = []
    bytes[0] = val & 0x000000ff
    bytes[1] = (val & 0x0000ff00) >> 8
    bytes[2] = (val & 0x00ff0000) >> 16
    bytes[3] = (val & 0x7f000000) >> 24

    return bytes
}

// console.log(intToBytesLittleEndian(287))
// console.log(intToBytesLittleEndian(32767))
// console.log(intToBytesLittleEndian(256))

let controller = new Controller("10.50.193.55", 44818)
controller.connect()

// tag = new LogixTag('rate')
//
// tag.read()