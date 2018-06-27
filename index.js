
let { LogixListener } = require('./LogixMessageListener')

// let newData = [0x00, 0x00, 0x01, 0x01, 0x02, 0x02]
//
// console.log(Buffer.from(newData))

let listener = new LogixListener()
// listener.listen('10.53.2.183')
// listener.listen('10.53.5.112')
listener.listen('10.50.71.127')

let arr = ["one", "two", "three", "four", "five"]
