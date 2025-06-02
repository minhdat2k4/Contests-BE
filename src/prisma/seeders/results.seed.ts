import { SeedParams } from "@/types/seed";

export default async function seedResults({ prisma, logger }: SeedParams) {
    try {
        await prisma.result.deleteMany();
        
        const contestantMatches = await prisma.contestantMatch.findMany({
            include: {
                contestant: true,
                match: {
                    include: {
                        questionPackage: {
                            include: {
                                questionDetails: {
                                    include: { question: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        if (contestantMatches.length === 0) {
            logger.warn("Không có dữ liệu thí sinh thi đấu để tạo kết quả");
            return [];
        }

        const results = [];
        
        for (const cm of contestantMatches) {
            const questions = cm.match.questionPackage.questionDetails;
            
            // Tạo kết quả cho một số câu hỏi (không phải tất cả)
            const answeredQuestions = questions
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.floor(Math.random() * questions.length) + 1);

            for (const questionDetail of answeredQuestions) {
                // 70% câu trả lời đúng, 30% sai
                const isCorrect = Math.random() > 0.3;
                
                results.push({
                    name: `Kết quả câu ${questionDetail.questionOrder}`,
                    contestantId: cm.contestantId,
                    matchId: cm.matchId,
                    isCorrect,
                    questionOrder: questionDetail.questionOrder
                });
            }
        }

        const createdResults = await Promise.all(
            results.map(result => prisma.result.create({ data: result }))
        );

        logger.info(`Tạo thành công ${createdResults.length} kết quả thi`);
        return createdResults;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu kết quả:", error);
        throw error;
    }
}
