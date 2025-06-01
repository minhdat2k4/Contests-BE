import { SeedParams } from "./seed.interface";

export default async function seedStudents({ prisma, logger }: SeedParams) {
    try {
        await prisma.student.deleteMany();
        
        const classes = await prisma.class.findMany({
            include: { school: true }
        });
        
        if (classes.length === 0) {
            throw new Error("Không có lớp học nào để tạo học sinh");
        }

        const students = [];
        
        // Tạo 5-8 học sinh cho mỗi lớp
        for (const classInfo of classes) {
            const studentCount = Math.floor(Math.random() * 4) + 5; // 5-8 học sinh
            
            for (let i = 1; i <= studentCount; i++) {
                const grade = classInfo.name.charAt(0); // Lấy khối (10, 11, 12)
                const studentCode = `${grade}${String(classInfo.id).padStart(2, '0')}${String(i).padStart(2, '0')}`;
                
                students.push({
                    fullName: `Học sinh ${i} lớp ${classInfo.name} - ${classInfo.school.name}`,
                    studentCode: studentCode,
                    classId: classInfo.id
                });
            }
        }

        const createdStudents = await Promise.all(
            students.map(student => prisma.student.create({ data: student }))
        );

        logger.info(`Tạo thành công ${createdStudents.length} học sinh`);
        return createdStudents;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu học sinh:", error);
        throw error;
    }
}
