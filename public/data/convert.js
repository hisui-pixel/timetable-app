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

            // 数値変換（学年と単位数）
            const gradeVal = parseInt(row['grade']) || 1;
            const creditsVal = parseInt(row['credits']) || 0;

            // ==========================================
            // 🌟 追加：データ変換ロジック
            // ==========================================

            // ① クラス（affiliation）を配列にする
            let rawAffiliation = row['affiliation'] ? row['affiliation'].trim() : "";
            let parsedAffiliation = [];

            if (rawAffiliation === "共通") {
                // 「共通」なら 1〜12組すべてを配列に入れる
                parsedAffiliation = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            } else if (!isNaN(rawAffiliation) && rawAffiliation !== "") {
                // "5" などの数字なら、数値として配列に入れる
                parsedAffiliation = [parseInt(rawAffiliation, 10)];
            } else {
                // それ以外（Jプログラムなど）なら文字列のまま配列に入れる
                parsedAffiliation = [rawAffiliation];
            }

            // ② 学期（semester）を前学期/後学期に統一する
            let rawSemester = row['semester'] ? row['semester'].trim() : "";
            let parsedSemester = rawSemester.replace('春学期', '前学期').replace('秋学期', '後学期');

            // ==========================================
            // 📦 授業オブジェクトの組み立て
            // ==========================================
            const course = {
                id: row['id'],
                name: row['name'],
                day: row['day'],
                period: row['period'],
                professor: row['professor'],
                type: row['type'],
                affiliation: parsedAffiliation, // 🌟 変換した配列をセット！
                credits: creditsVal,
                grade: [gradeVal],              // すでに配列化済み
                semester: parsedSemester        // 🌟 変換した学期をセット！
            };
            
            allCourses.push(course);
        }
    }

    // 最後に data.js として書き出し
    const jsContent = `// 自動生成・合体されたシラバスデータ\nconst mockCourses = ${JSON.stringify(allCourses, null, 4)};\n`;
    fs.writeFileSync(path.join(__dirname, outputJsFile), jsContent, 'utf8');

    console.log(`\n🎉 変換完了！ ${csvFiles.length}個のファイルから合計 ${allCourses.length} 件のデータを ${outputJsFile} にまとめました。`);
}