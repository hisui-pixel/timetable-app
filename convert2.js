const fs = require('fs');
const path = require('path');

const outputJsFile = 'data.js';
const allCourses = [];

// ① フォルダ内のCSVファイルを再帰的にすべて探す関数
function findCsvFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findCsvFiles(filePath, fileList);
        } else if (filePath.endsWith('.csv')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// ② CSVのテキストを配列に変換する関数（Excel特有の "" 囲みにも対応）
function parseCSV(str) {
    const result = [];
    let row = [];
    let inQuotes = false;
    let currentWord = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(currentWord.trim());
            currentWord = '';
        } else if (char === '\n' && !inQuotes) {
            row.push(currentWord.trim());
            result.push(row);
            row = [];
            currentWord = '';
        } else if (char !== '\r') {
            currentWord += char;
        }
    }
    if (currentWord || row.length > 0) {
        row.push(currentWord.trim());
        result.push(row);
    }
    return result.filter(r => r.length > 1 || r[0] !== ''); // 空行を除外
}

// ---------------- 実行処理ここから ----------------

// カレントディレクトリ（現在のフォルダ）以下のCSVを取得
const csvFiles = findCsvFiles(__dirname);

if (csvFiles.length === 0) {
    console.log("CSVファイルが見つかりませんでした。");
} else {
    for (const filePath of csvFiles) {
        console.log(`読み込み中: ${filePath}`);

        // ファイルを読み込む（UTF-8）
        let content = fs.readFileSync(filePath, 'utf8');

        // Excel特有のBOM（文字化け原因の透明な文字）があれば削除
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        const rows = parseCSV(content);
        if (rows.length < 2) continue; // データがない場合はスキップ

        const headers = rows[0];

        // 2行目以降のデータを処理
        for (let i = 1; i < rows.length; i++) {
            const rowArray = rows[i];
            const row = {};

            // ヘッダーと値を紐付ける
            headers.forEach((header, index) => {
                row[header] = rowArray[index] || "";
            });

            if (!row['id']) continue; // idが空ならスキップ

            // 数値変換と配列化（Python版と同じ処理）
            const gradeVal = parseInt(row['grade']) || 1;
            const creditsVal = parseInt(row['credits']) || 0;

            let rawAffiliation = row['affiliation'] || "";
            let parsedAffiliation = rawAffiliation;

            // もし文字列が "[" で始まり "]" で終わっていたら、配列に復元する
            if (typeof rawAffiliation === 'string' && rawAffiliation.startsWith('[') && rawAffiliation.endsWith(']')) {
                // 両端の [] を削る
                const innerText = rawAffiliation.slice(1, -1);
                
                if (innerText.trim() === "") {
                    parsedAffiliation = []; // 中身が空なら空配列
                } else {
                    // カンマで分割し、余計な空白やクォーテーション（' や "）を取り除く
                    parsedAffiliation = innerText.split(',').map(item => {
                        return item.replace(/['"]/g, '').trim();
                    });
                }
            }
            const course = {
                id: row['id'],
                name: row['name'],
                day: row['day'],
                period: row['period'],
                professor: row['professor'],
                type: row['type'],
                affiliation: parsedAffiliation,
                credits: creditsVal,
                grade: [gradeVal], // 🌟 配列化
                semester: row['semester']
            };
            allCourses.push(course);
        }
    }

    // 最後に data.js として書き出し
    const jsContent = `// 自動生成・合体されたシラバスデータ\nconst mockCourses = ${JSON.stringify(allCourses, null, 4)};\n`;
    fs.writeFileSync(path.join(__dirname, outputJsFile), jsContent, 'utf8');

    console.log(`\n🎉 変換完了！ ${csvFiles.length}個のファイルから合計 ${allCourses.length} 件のデータを ${outputJsFile} にまとめました。`);
}
