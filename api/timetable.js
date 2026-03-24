// api/timetable.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('timetableApp');
        const timetableCollection = database.collection('timetables');

        // 時間割の読み込み (GET /api/timetable?userId=xxx)
        if (req.method === 'GET') {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: "userIdが必要です" });

            const userTimetable = await timetableCollection.findOne({ userId: userId });
            // データがなければ空の配列を返す
            return res.status(200).json(userTimetable ? userTimetable.timetable : []);
        }

        // 時間割の保存 (POST /api/timetable)
        else if (req.method === 'POST') {
            const { userId, timetable } = req.body;

            // userIdをキーにして、存在すれば更新、なければ新規作成（upsert）
            await timetableCollection.updateOne(
                { userId: userId },
                { $set: { userId, timetable, updatedAt: new Date() } },
                { upsert: true }
            );

            return res.status(200).json({ message: "保存しました" });
        }

        else {
            return res.status(405).json({ message: "Method Not Allowed" });
        }

    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ error: "サーバーエラーが発生しました" });
    } finally {
        await client.close();
    }
}