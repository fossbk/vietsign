const Minio = require("minio");
require("dotenv").config();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const bucketName = process.env.MINIO_BUCKET_NAME || "vietsign";
const practiceBucketName = process.env.MINIO_PRACTICE_BUCKET_NAME || `${bucketName}-practice-private`;

// Ensure bucket exists
const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, "us-east-1");
      console.log(`Bucket "${bucketName}" created successfully.`);

      // Set public policy for the bucket so we can access files via URL
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Public policy set for bucket "${bucketName}".`);
    } else {
      console.log(`Bucket "${bucketName}" already exists.`);
    }
    if (!(await minioClient.bucketExists(practiceBucketName))) await minioClient.makeBucket(practiceBucketName, 'us-east-1');
    await minioClient.setBucketPolicy(practiceBucketName, '');
    // Preserve public sample policy; deny anonymous reads of historical student clips.
    const current = await minioClient.getBucketPolicy(bucketName).catch(e => {
      if (e.code === 'NoSuchBucketPolicy') return '{"Version":"2012-10-17","Statement":[]}';
      throw e;
    });
    const policy = JSON.parse(current);
    policy.Statement = (policy.Statement || []).filter(s => s.Sid !== 'CurriculumPracticePrivate');
    policy.Statement.push({Sid:'CurriculumPracticePrivate',Effect:'Deny',Principal:{AWS:['*']},Action:['s3:GetObject'],Resource:[`arn:aws:s3:::${bucketName}/curriculum-practice/*`]});
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
  } catch (error) {
    console.error("Error initializing MinIO:", error);
    throw error;
  }
};

module.exports = {
  minioClient,
  bucketName,
  practiceBucketName,
  initMinio,
};
