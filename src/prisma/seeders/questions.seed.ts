import { SeedParams } from "@/types/seed";
import { Difficulty, QuestionType } from "@prisma/client";

export default async function seedQuestions({ prisma, logger }: SeedParams) {
    try {
        await prisma.question.deleteMany();
        
        const topics = await prisma.questionTopic.findMany();
        if (topics.length === 0) {
            throw new Error("Không có chủ đề câu hỏi nào để tạo câu hỏi");
        }

        const sampleQuestions = [
            // Toán học
            {
                intro: "Câu hỏi Toán học cơ bản",
                defaultTime: 30,
                questionType: QuestionType.multiple_choice,
                plainText: "2 + 3 = ?",
                content: "<p>Tính: 2 + 3 = ?</p>",
                options: [
                    { id: "A", text: "4" },
                    { id: "B", text: "5" },
                    { id: "C", text: "6" },
                    { id: "D", text: "7" }
                ],
                correctAnswer: "B",
                score: 10,
                difficulty: Difficulty.Alpha,
                explanation: "2 + 3 = 5"
            },
            {
                intro: "Câu hỏi Toán học nâng cao",
                defaultTime: 60,
                questionType: QuestionType.multiple_choice,
                plainText: "Đạo hàm của hàm số y = x² là?",
                content: "<p>Đạo hàm của hàm số y = x² là?</p>",
                options: [
                    { id: "A", text: "x" },
                    { id: "B", text: "2x" },
                    { id: "C", text: "x²" },
                    { id: "D", text: "2x²" }
                ],
                correctAnswer: "B",
                score: 20,
                difficulty: Difficulty.Beta,
                explanation: "Đạo hàm của x² là 2x"
            },
            // Vật lý
            {
                intro: "Câu hỏi Vật lý cơ bản",
                defaultTime: 45,
                questionType: QuestionType.multiple_choice,
                plainText: "Đơn vị của vận tốc là gì?",
                content: "<p>Đơn vị của vận tốc trong hệ SI là gì?</p>",
                options: [
                    { id: "A", text: "m" },
                    { id: "B", text: "m/s" },
                    { id: "C", text: "m/s²" },
                    { id: "D", text: "kg" }
                ],
                correctAnswer: "B",
                score: 15,
                difficulty: Difficulty.Alpha,
                explanation: "Vận tốc có đơn vị là mét trên giây (m/s)"
            },
            // Hóa học
            {
                intro: "Câu hỏi Hóa học",
                defaultTime: 40,
                questionType: QuestionType.multiple_choice,
                plainText: "Công thức hóa học của nước là gì?",
                content: "<p>Công thức hóa học của nước là gì?</p>",
                options: [
                    { id: "A", text: "H₂O" },
                    { id: "B", text: "CO₂" },
                    { id: "C", text: "NaCl" },
                    { id: "D", text: "H₂SO₄" }
                ],
                correctAnswer: "A",
                score: 10,
                difficulty: Difficulty.Alpha,
                explanation: "Nước có công thức hóa học là H₂O"
            },
            // Sinh học
            {
                intro: "Câu hỏi Sinh học",
                defaultTime: 50,
                questionType: QuestionType.multiple_choice,
                plainText: "DNA viết tắt của từ gì?",
                content: "<p>DNA là viết tắt của từ gì?</p>",
                options: [
                    { id: "A", text: "Deoxyribonucleic Acid" },
                    { id: "B", text: "Ribonucleic Acid" },
                    { id: "C", text: "Amino Acid" },
                    { id: "D", text: "Fatty Acid" }
                ],
                correctAnswer: "A",
                score: 15,
                difficulty: Difficulty.Beta,
                explanation: "DNA là viết tắt của Deoxyribonucleic Acid (Axit deoxyribonucleic)"
            },
            // Lịch sử
            {
                intro: "Câu hỏi Lịch sử Việt Nam",
                defaultTime: 35,
                questionType: QuestionType.multiple_choice,
                plainText: "Việt Nam tuyên bố độc lập vào ngày nào?",
                content: "<p>Việt Nam tuyên bố độc lập vào ngày nào?</p>",
                options: [
                    { id: "A", text: "2/9/1945" },
                    { id: "B", text: "30/4/1975" },
                    { id: "C", text: "19/8/1945" },
                    { id: "D", text: "1/5/1975" }
                ],
                correctAnswer: "A",
                score: 10,
                difficulty: Difficulty.Alpha,
                explanation: "Việt Nam tuyên bố độc lập vào ngày 2/9/1945"
            },
            // Câu hỏi khó hơn
            {
                intro: "Câu hỏi khó",
                defaultTime: 90,
                questionType: QuestionType.essay,
                plainText: "Phân tích tác động của cách mạng công nghiệp 4.0 đến giáo dục",
                content: "<p>Hãy phân tích tác động của cách mạng công nghiệp 4.0 đến hệ thống giáo dục hiện tại và đưa ra những giải pháp thích ứng.</p>",
                options: null,
                correctAnswer: "Câu trả lời mở, cần phân tích đa chiều về tác động tích cực và tiêu cực, đề xuất giải pháp cụ thể.",
                score: 50,
                difficulty: Difficulty.Gold,
                explanation: "Đây là câu hỏi mở, yêu cầu thí sinh phân tích sâu và đưa ra quan điểm cá nhân có cơ sở."
            }
        ];

        const questions: Array<{
            intro: string | null;
            defaultTime: number;
            questionType: QuestionType;
            plainText: string;
            content: string;
            options: any;
            correctAnswer: string;
            score: number;
            difficulty: Difficulty;
            explanation: string | null;
            questionTopicId: number;
            questionMedia: any;
            mediaAnswer: any;
        }> = [];
        
        // Tạo câu hỏi cho mỗi chủ đề
        for (const topic of topics) {
            // Chọn ngẫu nhiên 2-3 câu hỏi mẫu cho mỗi chủ đề
            const questionCount = Math.floor(Math.random() * 2) + 2; // 2-3 câu
            const selectedQuestions = sampleQuestions
                .sort(() => 0.5 - Math.random())
                .slice(0, questionCount);

            for (const q of selectedQuestions) {
                questions.push({
                    ...q,
                    questionTopicId: topic.id,
                    questionMedia: null,
                    mediaAnswer: null
                });
            }
        }

        const createdQuestions = await Promise.all(
            questions.map(question => prisma.question.create({ data: question }))
        );

        logger.info(`Tạo thành công ${createdQuestions.length} câu hỏi`);
        return createdQuestions;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu câu hỏi:", error);
        throw error;
    }
}
