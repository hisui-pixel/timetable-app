import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const database = client.db('timetableApp');
        const timetableCollection = database.collection('timetables');

        if (req.method === 'GET') {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: "userIdが必要です" });

            const userTimetable = await timetableCollection.findOne({ userId });
            return res.status(200).json(userTimetable ? userTimetable.timetable : []);
        }

        if (req.method === 'POST') {
            const { userId, timetable } = req.body;

            await timetableCollection.updateOne(
                { userId },
                { $set: { userId, timetable, updatedAt: new Date() } },
                { upsert: true }
            );

            return res.status(200).json({ message: "保存しました" });
        }

        return res.status(405).json({ message: "Method Not Allowed" });

    } catch (error) {
        console.error("🔥 Database Error:", error);
        return res.status(500).json({ error: error.toString() });
    }
}