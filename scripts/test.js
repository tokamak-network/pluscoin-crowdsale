const moment = require('moment');

const startTime = moment.utc("2017-09-21T05:30").unix();
const startDate = moment.utc("2017-09-21T05:30");
const endTime = moment.utc("2017-09-21T06:30").unix();

const firstBonusDeadline = startDate.add(15, "minutes").unix();
const secondBonusDeadline = startDate.add(10, "minutes").unix();
const thirdBonusDeadline = startDate.add(10, "minutes").unix();
const fourthBonusDeadline = startDate.add(10, "minutes").unix();

console.log('startTime :', startTime);
console.log('firstBonusDeadline :', firstBonusDeadline);
console.log('secondBonusDeadline :', secondBonusDeadline);
console.log('thirdBonusDeadline :', thirdBonusDeadline);
console.log('fourthBonusDeadline :', fourthBonusDeadline);
console.log('endTime :', endTime);
