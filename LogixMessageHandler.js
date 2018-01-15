const net = require('net')

process.on('message', (message) => {

    const len = message.writeRequest[1]
    const dataTypePosition = (len * 2) + 2
    const dataType = message.writeRequest[dataTypePosition]

    const dataSize = getDataSize(dataType)
    const dataLength = message.writeRequest[dataTypePosition + 2]
    const dataValues = message.writeRequest.slice(dataTypePosition + 4, dataTypePosition + 4 + (dataLength * dataSize))

    if (dataType === 0xa0){
        const dataArr = [message.writeRequest[dataTypePosition], message.writeRequest[dataTypePosition + 1], message.writeRequest[dataTypePosition + 2], message.writeRequest[dataTypePosition + 3]]
        console.log(dataArr)
        let stringLengthPointer = dataTypePosition + 6
        let sl = [message.writeRequest[stringLengthPointer], message.writeRequest[stringLengthPointer + 1], message.writeRequest[stringLengthPointer + 2], message.writeRequest[stringLengthPointer + 3]]
        let stringLength = ((sl[3] << 24) + (sl[2] << 16) + (sl[1] << 8) + sl[0])
        console.log(sl)
        console.log(`string length = ${stringLength}`)
        let str = ""
        for (let i = stringLengthPointer + 4; i < stringLengthPointer + 4 + stringLength; i++){
            str += String.fromCharCode(message.writeRequest[i])
        }

        console.log(str)
        return
    }


    let parsedDataValues = []

    for (let i = 0; i < dataValues.length; i ++){
        let dataValue = 0
        switch (dataSize){
            case 1:
                dataValue = dataValues[i]
                parsedDataValues.push(dataValue)
                break
            case 2:
                if (i % 2 === 0){
                    dataValue = (dataValues[i + 1] << 8) + dataValues[i]
                    parsedDataValues.push(dataValue)
                }
                break
            case 4:
                if (i % 4 === 0){
                    if (dataType === 0xc4){
                        dataValue = ((dataValues[i + 3] << 24) + (dataValues[i + 2] << 16) + (dataValues[i + 1] << 8) + dataValues[i])
                        parsedDataValues.push(dataValue)
                    }else if (dataType === 0xca){
                        // const fArr = [dataValues[i+3], dataValues[i + 2], dataValues[i + 1], dataValues[i]]
                        // const fArr = `0x${dataValues[i+3]}${dataValues[i + 2]}${dataValues[i + 1]}${dataValues[i]}`
                        // const f =
                        const fVal = floatFromBytes(((dataValues[i + 3] << 24) + (dataValues[i + 2] << 16) + (dataValues[i + 1] << 8) + dataValues[i]))
                        // console.log(fArr)
                        parsedDataValues.push(fVal)
                    }else{
                        //TODO: handle dword data type or remove is not needed
                    }
                }
                break
            case 8:
                if (i % 8 === 0) {
                    dataValue = (dataValues[i + 7] << 88) + (dataValues[i + 6] << 72) + (dataValues[i + 5] << 56) + (dataValues[i + 4] << 40) + (dataValues[i + 3] << 24) + (dataValues[i + 2] << 16) + (dataValues[i + 1] << 8) + dataValues[i]
                    parsedDataValues.push(dataValue)
                }
                break
            case 10:
                console.log('case 10')
                console.log(dataValues)
                let stringLength = ((dataValues[3] << 24) + (dataValues[2] << 16) + (dataValues[1] << 8) + dataValues[0])
                console.log(stringLength)
                break

        }



    }

    console.log(parsedDataValues)
    console.log('handling message')
})

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


