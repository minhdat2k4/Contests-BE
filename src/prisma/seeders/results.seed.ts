import { SeedParams } from "@/types/seed";

export default async function seedResults({ prisma, logger }: SeedParams) {
    try {
        // Xóa dữ liệu cũ
        await prisma.result.deleteMany();
        logger.info("🗑️ Đã xóa dữ liệu results cũ");

        // Lấy danh sách contestants và matches
        const contestants = await prisma.contestant.findMany({
            select: { id: true, name: true }
        });

        const matches = await prisma.match.findMany({
            select: { id: true, name: true }
        });

        if (contestants.length === 0) {
            logger.warn("⚠️ Không có contestants để tạo results");
            return [];
        }

        if (matches.length === 0) {
            logger.warn("⚠️ Không có matches để tạo results");
            return [];
        }

        logger.info(`📊 Tìm thấy ${contestants.length} contestants và ${matches.length} matches`);

        const results = [];
        
        // Tạo sample results cho mỗi contestant trong mỗi match
        for (const contestant of contestants) {
            for (const match of matches) {
                // Tạo 5-10 câu hỏi ngẫu nhiên cho mỗi contestant trong mỗi match
                const numberOfQuestions = Math.floor(Math.random() * 6) + 5; // 5-10 câu
                
                for (let questionOrder = 1; questionOrder <= numberOfQuestions; questionOrder++) {
                    // Tạo tỷ lệ đúng/sai ngẫu nhiên (70% đúng, 30% sai)
                    const isCorrect = Math.random() > 0.3;
                    
                    // Tạo tên câu hỏi mô tả
                    const questionTypes = ['Toán học', 'Lý thuyết', 'Thực hành', 'Phân tích', 'Tổng hợp'];
                    const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
                    
                    results.push({
                        name: `${randomType} - Câu ${questionOrder}`,
                        contestantId: contestant.id,
                        matchId: match.id,
                        isCorrect,
                        questionOrder
                    });
                }
            }
        }

        logger.info(`📝 Chuẩn bị tạo ${results.length} results...`);

        // Tạo results theo batch để tránh duplicate key errors
        const createdResults = [];
        const batchSize = 50;
        
        for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);
            
            for (const result of batch) {
                try {
                    // Kiểm tra duplicate trước khi tạo
                    const existing = await prisma.result.findFirst({
                        where: {
                            contestantId: result.contestantId,
                            matchId: result.matchId,
                            questionOrder: result.questionOrder
                        }
                    });

                    if (!existing) {
                        const created = await prisma.result.create({ 
                            data: result,
                            include: {
                                contestant: {
                                    select: { name: true }
                                },
                                match: {
                                    select: { name: true }
                                }
                            }
                        });
                        createdResults.push(created);
                    }                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    logger.warn(`⚠️ Không thể tạo result cho contestant ${result.contestantId}, match ${result.matchId}, question ${result.questionOrder}: ${errorMessage}`);
                }
            }
            
            logger.info(`✅ Đã tạo batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(results.length/batchSize)}`);
        }

        // Tạo thống kê
        const totalResults = createdResults.length;
        const correctResults = createdResults.filter(r => r.isCorrect).length;
        const incorrectResults = totalResults - correctResults;
        const accuracy = totalResults > 0 ? ((correctResults / totalResults) * 100).toFixed(2) : 0;

        logger.info(`🎉 Tạo thành công ${totalResults} results:`);
        logger.info(`   ✅ Đúng: ${correctResults} (${accuracy}%)`);
        logger.info(`   ❌ Sai: ${incorrectResults} (${(100 - parseFloat(accuracy.toString())).toFixed(2)}%)`);
        
        // Log sample data
        if (createdResults.length > 0) {
            const sample = createdResults[0];
            logger.info(`📋 Sample result: "${sample.name}" - Contestant: ${sample.contestant.name}, Match: ${sample.match.name}, Correct: ${sample.isCorrect}`);
        }

        return createdResults;
    } catch (error) {
        logger.error("❌ Lỗi khi tạo dữ liệu results:", error);
        throw error;
    }
}
