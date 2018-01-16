const {DataType} = require('./LogixTag')
const EIP = require('./EIP')
const binary = require('./binaryConverter')

class LogixTagList{

    constructor(){
        this.controller = undefined
        this.scanTime = 1000

        this.status = 0
        this.tags = []
        this.Scan
    }

    add(tag){
        this.tags.push(tag)
    }

    clear(){
        this.tags = []
    }

    startScan(){
        this.Scan = setInterval(() => this.readAll(), this.scanTime)
    }

    stopScan(){
        clearInterval(this.Scan)
    }

    readAll(){

        if (this.tags.length === 0){
            console.log('There are no tags assigned to TagList.')
            return 'There are no tags assigned to TagList.'

        }

        if (this.controller === undefined){
            console.log('tag list controller not defined')
            return 'tag controller not defined'

        }

        if (!this.controller.isConnected){
            console.log('tag list controller is not connected')
            //TODO: if controller is not connected attempt connection.
        }

        //TODO: verify tag name matches allen bradley tag names

        //request service word 0 request service, word 1 request path size, word 2 - 5 request path
        const requestService = [0x0a, 0x02, 0x20, 0x02, 0x24, 0x01]

        const requestData = binary.ConvertIntTo2BytesLittleEndian(this.tags.length)

        const offsetStartPosition = (this.tags.length * 2) + 2
        let requestDataOffsets = binary.ConvertIntTo2BytesLittleEndian(offsetStartPosition)
        let readTagService = []

        for (let i = 0; i < this.tags.length; i++){
            let tagReadRequest = this.tags[i].createReadRequest()
            readTagService = readTagService.concat(tagReadRequest)
            if (i < this.tags.length - 1){
                requestDataOffsets = requestDataOffsets.concat(binary.ConvertIntTo2BytesLittleEndian(offsetStartPosition + readTagService.length))
            }
        }

        const sendData = requestService.concat(requestData, requestDataOffsets, readTagService)

        let data = EIP.Build_EIP_CIP_Header(this.controller, sendData)

        this.cipSequenceID = binary.ConvertTwoBytesLittleEndianToInt(data.sequenceID)
        console.log(data.writeData)
        this.controller.connection.write(data.writeData)

    }

    writeAll(){

        if (this.tags.length === 0){
            console.log('There are no tags assigned to TagList.')
            return 'There are no tags assigned to TagList.'

        }

        if (this.controller === undefined){
            console.log('tag list controller not defined')
            return 'tag controller not defined'

        }

        if (!this.controller.isConnected){
            console.log('tag list controller is not connected')
            //TODO: if controller is not connected attempt connection.
        }

        const requestService = [0x0a, 0x02, 0x20, 0x02, 0x24, 0x01]

        const requestData = binary.ConvertIntTo2BytesLittleEndian(this.tags.length)

        const offsetStartPosition = (this.tags.length * 2) + 2
        let requestDataOffsets = binary.ConvertIntTo2BytesLittleEndian(offsetStartPosition)
        let writeTagService = []

        for (let i = 0; i < this.tags.length; i++){
            let tagWriteRequest = this.tags[i].createWriteRequest()
            writeTagService = writeTagService.concat(tagWriteRequest)
            if (i < this.tags.length - 1){
                requestDataOffsets = requestDataOffsets.concat(binary.ConvertIntTo2BytesLittleEndian(offsetStartPosition + writeTagService.length))
            }
        }

        const sendData = requestService.concat(requestData, requestDataOffsets, writeTagService)

        let data = EIP.Build_EIP_CIP_Header(this.controller, sendData)

        this.cipSequenceID = binary.ConvertTwoBytesLittleEndianToInt(data.sequenceID)
        console.log(data.writeData)
        this.controller.connection.write(data.writeData)

    }
}

module.exports = {LogixTagList}