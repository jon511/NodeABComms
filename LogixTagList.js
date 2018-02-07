const {DataType} = require('./LogixTag')
const EIP = require('./EIP')
const binary = require('./binaryConverter')

/**
 * LogixTagList is a class that is used to groupg any number of tags together for reading and writing of
 * multiple tags at once.
 * Proerties:
 *  name - optional. user defined description of tag list
 *  controller - controller must be assigned before reading or writing can be performed
 *  Scsn - used to poll controller tag values of all tag contained in the tag list.
 *  scanTime - duration (in milliseconds) of poll rate.
 *  status - scan status returns scan state of tag list.
 */
class LogixTagList{

    constructor(){
        this.name = ''
        this.controller = undefined
        this.errorCode = int
        this.error = ""
        this.status
        this.Scan
        this._scanTime = 1000
        this._scanStatus = 0
        this.tags = []

    }

    set scanTime(val){
        if (val < 100){
            this._scanTime = 1000
            console.log(`Scan time cannot be less than 100 milliseconds.`)
            return
        }

        this._scanTime = val
    }

    get scanTime() {

        return this._scanTime
    }

    get scanStatus() {
        if (this.Scan){
            return 1
        }

        //TODO: check if setInterval is active

        return 0
    }

    /**
     * used to add tags to tag list. tags should only be added using the add method and not by
     * accessing the tag array directly.
     * @param tag
     * @returns {string}
     */
    add(tag){

        this.tags.push(tag)
    }

    /**
     * clears all tags from tag list
     */
    clear(){
        this.tags = []
    }

    startScan(){

        if (this.controller === undefined){
            console.log(`tag list does not have controller assigned`)
            return `tag list does not have controller assigned`
        }

        if (this.tags.length === 0) {
            console.log(`tag list does not contain any tags. Scan cannot be started`)
            return `tag list does not contain any tags. Scan cannot be started`
        }

        this.Scan = setInterval(() => this.readAll(), this._scanTime)
    }

    stopScan(){
        clearInterval(this.Scan)
    }

    /**
     *
     * @returns {string}
     */
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
            return 'tag list controller is not connected'
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

        let reqObject = {
            tagList: this
            writeData: data

        }

        this.controller.addSendRequest(reqObject)

    }

    writeAll(){

        if (this.tags.length === 0){
            console.log('There are no tags assigned to TagList.')
            return 'There are no tags assigned to TagList.'

        }

        if (this.controller === undefined){
            console.log('tag list controller not defined')
            return 'tag list controller not defined'

        }

        if (!this.controller.isConnected){
            console.log('tag list controller is not connected')
            return 'tag list controler is not connected'
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

        let reqObject = {
            tag: this.tags,
            writeData: data
        }

        console.log(new Buffer(reqObject.writeData))
        this.controller.addSendRequest(reqObject)

    }
}

module.exports = {LogixTagList}