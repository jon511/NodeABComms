
const net = require('net')
const binary = require('./binaryConverter')
const {LogixController} = require('./LogixController')
const {LogixTag, DataType} = require('./LogixTag')
const {LogixTagList} = require('./LogixTagList')
const { LogixListener } = require('./LogixMessageListener')


let tag = new LogixTag('tempTag', )
tag.setValue(10)

tag.on('dataChanged', () => {
    console.log('data changed')
})


let l = new LogixController('10.50.201.116', 44818)
l.connect()
l.connection.setTimeout(5000)
let slcTag1 = new LogixTag('N199:90', DataType.INT)
slcTag1.controller = l
slcTag1.read()

l.autoConnect = true
l.on('error', (err, cont) => {

})

// let l = new LogixController('10.50.193.55', 44818)
// l.connect()
// l.connection.setTimeout(3000)
// let newTag1 = new LogixTag('rate', DataType.DINT)
// let newTag2 = new LogixTag('rateInt', DataType.INT)
// let newTag3 = new LogixTag('rateArray', DataType.DINT)
// newTag3.length = 3
// newTag3.controller = l
//
// let tagGroup = new LogixTagList()
// tagGroup.add(newTag1)
// tagGroup.add(newTag2)
// tagGroup.controller = l
//
//
// l.on('connected', ()=>{
//
//     newTag3.length = 2
//     newTag3.value = [2500, 3500]
//     // newTag3.write()
//     l.writeTag(newTag3)
//     newTag1.value = 108
//     newTag2.value = 109
//
//     tagGroup.writeAll()
// })
//
//
// l.on('readComplete', (data) => {
//     console.log('read complete')
//     console.log(data)
//
//     for (let i in l.activeTagList){
//         console.log(l.activeTagList[i].name)
//         if (l.activeTagList[i].cipSequenceID === binary.ConvertTwoBytesLittleEndianToInt(data.slice(0, 2))){
//             if (data[6] === 196){
//                 l.activeTagList[i].value = binary.ConvertFourBytesLittleEndianToInt(data.slice(8))
//                 // l.activeTagList.splice(i,1)
//                 // console.log(i)
//             }else if (data[6] === 195){
//                 l.activeTagList[i].value = binary.ConvertTwoBytesLittleEndianToInt(data.slice(8))
//                 // l.activeTagList.splice(i,1)
//                 // console.log(i)
//             }
//         }
//     }
//
//     console.log(newTag1.value)
//     console.log(newTag2.value
//     )
//
//     console.log('read complete')
//     console.log(l.sequenceCounter)
//     if (l.sequenceCounter > 10){
//         tagGroup.stopScan()
//     }
// })
//
// l.on('timeout', () => {
//     l.connection.end()
//     console.log('timeout')
// })



// let Listener = new LogixListener()
// // Listener.server.listen(44818, '10.53.2.200')
//
// // Listener.server.listen(44818, '10.50.71.140')
// Listener.server.listen(2222, '10.50.71.140')
// Listener.on('mofo', (err)=>{
//     console.log('this is a mofo')
//     console.log(err)
//
// })




