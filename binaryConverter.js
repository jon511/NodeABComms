/**
 * converts to floating point
 * @param val
 * @returns {number}
 */
const ConvertHexToFloatingPoint = (val) => {

    let a = (((val >> 31) * -1) === 0) ? 1 : -1
    let b = ((val >> 23) & 0x0ff) - 127
    let c = 0
    let p = 1
    for (let i = 22; i > 0; i--){
        let s = (val >> i) & 0x01
        c += (Math.pow(2, -p) * s)
        p++
    }
    return (a * (1 + c) * Math.pow(2, b))

}

/**
 *Converts int to little endian byte array with length of 2
 * @param val {int}
 * @returns {Array}
 */
const ConvertIntTo2BytesLittleEndian = (val) => {
    let b = []
    b[0] = val & 0x000000ff
    b[1] = (val & 0x0000ff00) >> 8

    return b
}

/**
 *Converts int to little endian byte array with length of 2
 * @param val {int}
 * @returns {Array}
 */
const ConvertIntTo4BytesLittleEndian = (val) => {
    let b = []
    b[0] = val & 0x000000ff
    b[1] = (val & 0x0000ff00) >> 8
    b[2] = (val & 0x00ff0000) >> 16
    b[3] = (val & 0x7f000000) >> 24

    return b
}

/**
 * Converts byte array with length of 4 to int
 * @param bytes {array}
 * @returns {int}
 */
const ConvertFourBytesLittleEndianToInt = (bytes) => {

    return bytes[0] + (bytes[1] << 8) + (bytes[2] << 16) + (bytes[3] << 24)
}

/**
 * Converts byte array with length of 2 to int
 * @param bytes {array}
 * @returns {int}
 */
const ConvertTwoBytesLittleEndianToInt = (bytes) => {
    return bytes[0] + (bytes[1] << 8)
}

/**
 * Converts byte array with length of 8 to int
 * @param bytes {array}
 * @returns {int}
 */
const ConvertEightBytesLittleEndianToInt = (bytes) => {

    return bytes[0] + (bytes[1] << 8) + (bytes[2] << 16) + (bytes[3] << 24) + (bytes[4] << 32) + (bytes[4] << 40) + (bytes[4] << 48) + (bytes[4] << 56)
}


module.exports = {
    ConvertHexToFloatingPoint,
    ConvertIntTo2BytesLittleEndian,
    ConvertIntTo4BytesLittleEndian,
    ConvertFourBytesLittleEndianToInt,
    ConvertTwoBytesLittleEndianToInt,
    ConvertEightBytesLittleEndianToInt,
}