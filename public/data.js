import {grade1_1} from './data/grade1/data1_1.js';
import {grade1_2} from './data/grade1/data1_2.js';
import {grade2_1} from './data/grade2/data2_1.js';
import {grade2_2} from './data/grade2/data2_2.js';
import {grade3_1} from './data/grade3/data3_1.js';
import {grade3_2} from './data/grade3/data3_2.js';
import {grade4} from './data/grade4/data4.js';
import { experimentData } from './data/grade1/data_ex.js';

// ① 全部まとめて1つの配列にする
const Data = [
    ...experimentData,
    ...grade4,
    ...grade3_2,
    ...grade3_1,
    ...grade2_2,
    ...grade2_1,
    ...grade1_2,
    ...grade1_1
];

// ② idで重複排除
const allData = Array.from(
    new Map(Data.map(c => [c.id, c])).values()
);

export default allData;