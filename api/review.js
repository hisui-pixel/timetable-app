// api/review.js
const { MongoClient } = require('mongodb');

// Vercelの金庫（環境変数）からURLを引っ張り出してくる！
const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        // 'timetableApp' というデータベースの 'reviews' という箱を使います
        const database = client.db('timetableApp'); 
        const reviewsCollection = database.collection('reviews');

        // ① 画面が開いた時（GET: データをちょうだい！）
        if (req.method === 'GET') {
            // MongoDBから口コミを全部取ってくる（_idという不要なデータは省く）
            const allReviews = await reviewsCollection.find({}, { projection: { _id: 0 } }).toArray();
            return res.status(200).json(allReviews);
        }
        
        // ② 口コミを書いた時（POST: データを保存して！）
        else if (req.method === 'POST') {
            const newReview = req.body;
            // idがなければ、今まで通り現在時刻をidにする
            if (!newReview.id) newReview.id = Date.now();
            
            // MongoDBにデータを1件ドーン！と保存
            await reviewsCollection.insertOne(newReview);
            return res.status(200).json({ message: "MongoDBに保存成功！", data: newReview });
        }

        else if (req.method === 'DELETE') {
            const { reviewId, authorId } = req.body;

            // ① レビューを取得
            const review = await reviewsCollection.findOne({ id: reviewId });

            if (!review) {
                return res.status(404).json({ error: "レビューが存在しません" });
            }

            // ② 投稿者チェック
            if (review.authorId !== authorId) {
                return res.status(403).json({ error: "削除権限がありません" });
            }

            // ③ 削除
            await reviewsCollection.deleteOne({ id: reviewId });

            return res.status(200).json({ message: "削除成功" });
        }
        
        else {
            return res.status(405).json({ message: "許可されていない操作です" });
        }

    } catch (error) {
        console.error("DBエラー:", error);
        return res.status(500).json({ error: "サーバーでエラーが発生しました" });
    } finally {
        // 最後に必ず金庫の扉を閉める
        await client.close();
    }
}