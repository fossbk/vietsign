/**
 * Tất cả Swagger Documentation được định nghĩa ở đây
 */

const swaggerDocs = {
  // Authentication APIs
  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "User login",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: {
                  type: "string",
                  example: "hocsinh@gmai.com",
                },
                password: {
                  type: "string",
                  example: "123456",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  accessToken: { type: "string" },
                  user: {
                    type: "object",
                    properties: {
                      user_id: { type: "string" },
                      email: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        401: {
          description: "Sai email hoặc mật khẩu",
        },
      },
    },
  },

  "/auth/register": {
    post: {
      tags: ["Authentication"],
      summary: "Resgister a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password", "name"],
              properties: {
                email: {
                  type: "string",
                  example: "newuser@example.com",
                },
                password: {
                  type: "string",
                  example: "password123",
                },
                name: {
                  type: "string",
                  example: "Nguyễn Văn A",
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Đăng ký thành công",
        },
        400: {
          description: "Email đã tồn tại",
        },
      },
    },
  },

  // Protected Route Example
  // '/me': {
  //   get: {
  //     tags: ['User'],
  //     summary: 'Lấy thông tin người dùng hiện tại',
  //     security: [{ bearerAuth: [] }],
  //     responses: {
  //       200: {
  //         description: 'Thành công',
  //         content: {
  //           'application/json': {
  //             schema: {
  //               type: 'object',
  //               properties: {
  //                 message: { type: 'string' },
  //                 user: { type: 'object' }
  //               }
  //             }
  //           }
  //         }
  //       },
  //       401: {
  //         description: 'Chưa đăng nhập'
  //       }
  //     }
  //   }
  // },

  // Thêm các routes khác ở đây theo cùng format
  "/users/profile": {
    get: {
      tags: ["User"],
      summary: "Get personal profile information",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  phone_number: { type: "string" },
                  code: { type: "string" },
                  is_deleted: {
                    type: "buffer",
                    data: {
                      type: "boolean",
                    },
                  },
                  is_auth2: {
                    type: "buffer",
                    data: {
                      type: "boolean",
                    },
                  },
                  created_by: { type: "string" },
                  created_date: { type: "string", format: "date-time" },
                  modified_by: { type: "string" },
                  modified_date: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        401: {
          description: "Unauthorized",
        },
        404: {
          description: "User not found",
        },
        500: {
          description: "Internal server error",
        },
      },
    },
    put: {
      tags: ["User"],
      summary: "Update personal profile information",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", example: "Nguyễn Văn B" },
                email: { type: "string", example: "newemail@example.com" },
                phone_number: { type: "string", example: "0123456789" },
                gender: { type: "string", example: "Male" },
                address: {
                  type: "string",
                  example: "123 Đường ABC, Quận 1, TP.HCM",
                },
                avatar_location: {
                  type: "string",
                  example: "/images/avatar.jpg",
                },
                birth_day: {
                  type: "string",
                  format: "date",
                  example: "1990-01-01",
                },
                code: { type: "string", example: "ADMIN" },
                school_id: { type: "string", example: "SCHOOL001" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Profile updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
        401: {
          description: "Unauthorized",
        },
      },
    },
  },

  "/organizations": {
    get: {
      tags: ["Organization"],
      summary: "Get list of organizations",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    organization_id: { type: "string" },
                    parent_id: { type: "string" },
                    name: { type: "string" },
                    slug: { type: "string" },
                    address: { type: "string" },
                    phone: { type: "string" },
                    email: { type: "string" },
                    status: { type: "string" },
                    created_by: { type: "string" },
                    created_date: { type: "string", format: "date-time" },
                    modified_by: { type: "string" },
                    modified_date: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
        500: {
          description: "Internal server error",
        },
      },
    },
    get: {
      tags: ["Organization"],
      summary: "Get information of an organization by ID",
      parameters: [
        {
          name: "organization_id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "ID of the organization to retrieve",
        },
      ],
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  organization_id: { type: "string" },
                  parent_id: { type: "string" },
                  name: { type: "string" },
                  slug: { type: "string" },
                  address: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string" },
                  status: { type: "string" },
                  created_by: { type: "string" },
                  created_date: { type: "string", format: "date-time" },
                  modified_by: { type: "string" },
                  modified_date: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        404: {
          description: "Organization not found",
        },
        500: {
          description: "Internal server error",
        },
      },
    },

    post: {
      tags: ["Organization"],
      summary: "Create a new organization",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "type"],
              properties: {
                parent_id: {
                  type: "string",
                  example: "null - Bộ Giáo dục, 1 - Sở Giáo dục, 2 - Trường",
                },
                name: { type: "string", example: "Trường THPT Nguyễn Huệ" },
                type: { type: "string", example: "SCHOOL" },
                address: { type: "string", example: "Số 12 Đường Nguyễn Huệ" },
                city: { type: "string", example: "Thành phố Hà Nội" },
                ward: { type: "string", example: "Quận Hoàn Kiếm" },
                street: { type: "string", example: "Đường Nguyễn Huệ" },
                phone: { type: "string", example: "024 3825 6789" },
                email: { type: "string", example: "thptnguyenhue@edu.vn" },
              },
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: "Organization created successfully",
      },
      400: {
        description:
          "Bad request - missing required fields or invalid parent ID",
      },
      500: {
        description: "Internal server error",
      },
    },
    put: {
      tags: ["Organization"],
      summary: "Update an existing organization",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "ID of the organization to update",
        },
      ],
      requestBody: {
        required: true,
        description: "Can update any of the organization fields",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                parent_id: {
                  type: "string",
                  example: "null - Bộ Giáo dục, 1 - Sở Giáo dục, 2 - Trường",
                },
                name: { type: "string", example: "Trường THPT Nguyễn Huệ" },
                type: { type: "string", example: "SCHOOL" },
                address: { type: "string", example: "Số 12 Đường Nguyễn Huệ" },
                city: { type: "string", example: "Thành phố Hà Nội" },
                ward: { type: "string", example: "Quận Hoàn Kiếm" },
                street: { type: "string", example: "Đường Nguyễn Huệ" },
                phone: { type: "string", example: "024 3825 6789" },
                email: { type: "string", example: "thptnguyenhue@edu.vn" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Organization updated successfully",
        },
        400: {
          description: "Bad request - invalid parent ID",
        },
        404: {
          description: "Organization not found",
        },
        500: {
          description: "Internal server error",
        },
      },
    },
    delete: {
      tags: ["Organization"],
      summary: "Delete an organization",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "ID of the organization to delete",
        },
      ],
      responses: {
        200: {
          description: "Organization deleted successfully",
        },
        404: {
          description: "Organization not found",
        },
        500: {
          description: "Internal server error",
        },
      },
    },
  },

  "/organization-managers": {
    post: {
      tags: ["Organization Manager Assignment"],
      summary: "Assign organization management role to a user",
      security: [{ bearerAuth: [] }],
      description:
        "Is_primary: Nếu true thì user này sẽ là quản lý chính của tổ chức, các quản lý khác sẽ bị hạ xuống không phải quản lý chính nữa.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["organization_id", "user_id", "role_in_org"],
              properties: {
                organization_id: { type: "string", example: "123" },
                user_id: { type: "string", example: "456" },
                role_in_org: {
                  type: "string",
                  example: "SUPER_ADMIN",
                  enum: [
                    "SUPER_ADMIN",
                    "CENTER_ADMIN",
                    "SCHOOL_ADMIN",
                    "TEACHER",
                    "STUDENT",
                  ],
                },
                is_primary: { type: "boolean", example: true },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Role assigned successfully",
        },
        400: {
          description: "Missing required fields",
        },
        409: {
          description: "Conflict: User already has a role in this organization",
        },
        500: {
          description: "Internal server error",
        },
      },
    },
    delete: {
      tags: ["Organization Manager Assignment"],
      summary: "Revoke organization management role from a user",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["organization_id", "user_id"],
              properties: {
                organization_id: { type: "string", example: "12" },
                user_id: { type: "string", example: "34" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Role revoked successfully",
        },
        400: {
          description: "Missing required fields",
        },
        404: {
          description: "Not Found: No such role assignment",
        },
        500: {
          description: "Internal server error",
        },
      },
    },
  },

  // Teacher Management APIs
  "/users/teachers": {
    get: {
      tags: ["Teacher Management"],
      summary: "Get list of all teachers",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
        {
          name: "q",
          in: "query",
          schema: { type: "string" },
          description: "Search by name or email",
        },
        {
          name: "school_id",
          in: "query",
          schema: { type: "string" },
          description: "Filter by school ID",
        },
      ],
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  teachers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        user_id: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string" },
                        phone_number: { type: "string" },
                        code: { type: "string", example: "TEACHER" },
                      },
                    },
                  },
                  meta: {
                    type: "object",
                    properties: {
                      page: { type: "integer" },
                      limit: { type: "integer" },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
    post: {
      tags: ["Teacher Management"],
      summary: "Create a new teacher",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email"],
              properties: {
                name: { type: "string", example: "Nguyễn Văn A" },
                email: { type: "string", example: "teacher@example.com" },
                phoneNumber: { type: "string", example: "0123456789" },
                birthDay: {
                  type: "string",
                  format: "date",
                  example: "1985-05-15",
                },
                address: { type: "string", example: "123 Đường ABC" },
                classRoomName: { type: "string", example: "Lớp 10A1" },
                schoolName: {
                  type: "string",
                  example: "Trường THPT Nguyễn Huệ",
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Teacher created successfully" },
        400: { description: "Bad request - missing required fields" },
        409: { description: "Email already exists" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/users/teachers/{id}": {
    get: {
      tags: ["Teacher Management"],
      summary: "Get teacher details by ID",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Success" },
        404: { description: "Teacher not found" },
        500: { description: "Internal server error" },
      },
    },
    put: {
      tags: ["Teacher Management"],
      summary: "Update teacher information",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone_number: { type: "string" },
                gender: { type: "string" },
                birth_day: { type: "string", format: "date" },
                address: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Teacher updated successfully" },
        404: { description: "Teacher not found" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Teacher Management"],
      summary: "Delete a teacher",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Teacher deleted successfully" },
        404: { description: "Teacher not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  // Student Management APIs
  "/users/students": {
    get: {
      tags: ["Student Management"],
      summary: "Get list of all students",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
        {
          name: "q",
          in: "query",
          schema: { type: "string" },
          description: "Search by name or email",
        },
      ],
      responses: {
        200: { description: "Success" },
        500: { description: "Internal server error" },
      },
    },
    post: {
      tags: ["Student Management"],
      summary: "Create a new student",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email"],
              properties: {
                name: { type: "string", example: "Nguyễn Văn B" },
                email: { type: "string", example: "student@example.com" },
                phoneNumber: { type: "string", example: "0987654321" },
                birthDay: {
                  type: "string",
                  format: "date",
                  example: "2005-08-20",
                },
                address: { type: "string", example: "456 Đường XYZ" },
                classRoomName: { type: "string", example: "Lớp 10A1" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Student created successfully" },
        400: { description: "Bad request - missing required fields" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/users/students/{id}": {
    get: {
      tags: ["Student Management"],
      summary: "Get student details by ID",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Success" },
        404: { description: "Student not found" },
        500: { description: "Internal server error" },
      },
    },
    put: {
      tags: ["Student Management"],
      summary: "Update student information",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone_number: { type: "string" },
                gender: { type: "string" },
                birth_day: { type: "string", format: "date" },
                address: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Student updated successfully" },
        404: { description: "Student not found" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Student Management"],
      summary: "Delete a student",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Student deleted successfully" },
        404: { description: "Student not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  // Student Learning Tracking APIs
  "/users/students/tracking/view-lesson": {
    post: {
      tags: ["Student Learning Tracking"],
      summary: "Record student lesson view",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId", "lessonId"],
              properties: {
                studentId: { type: "string", example: "1" },
                lessonId: { type: "string", example: "10" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Lesson viewed successfully" },
        400: { description: "Missing required fields" },
        404: { description: "Student or lesson not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/users/students/tracking/view-vocabulary": {
    post: {
      tags: ["Student Learning Tracking"],
      summary: "Record student vocabulary view",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId", "vocabularyId"],
              properties: {
                studentId: { type: "string", example: "1" },
                vocabularyId: { type: "string", example: "20" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Vocabulary viewed successfully" },
        400: { description: "Missing required fields" },
        404: { description: "Student or vocabulary not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/users/students/progress/learning": {
    get: {
      tags: ["Student Learning Tracking"],
      summary: "Get student learning progress",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  lessonViews: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        lesson_id: { type: "string" },
                        view_count: { type: "integer" },
                        last_viewed_at: { type: "string", format: "date-time" },
                      },
                    },
                  },
                  vocabularyViews: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        vocabulary_id: { type: "string" },
                        view_count: { type: "integer" },
                        last_viewed_at: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  // Classroom Management APIs
  "/teaching-management/classrooms": {
    get: {
      tags: ["Classroom Management"],
      summary: "Get list of all classrooms",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
        {
          name: "q",
          in: "query",
          schema: { type: "string" },
          description: "Search by name or description",
        },
        { name: "schoolId", in: "query", schema: { type: "string" } },
        { name: "teacherId", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Success" },
        500: { description: "Internal server error" },
      },
    },
    post: {
      tags: ["Classroom Management"],
      summary: "Create a new classroom",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "classLevel"],
              properties: {
                name: { type: "string", example: "Lớp 10A1" },
                description: { type: "string", example: "Lớp học khối 10" },
                classCode: { type: "string", example: "CLASS001" },
                classLevel: { type: "string", example: "10" },
                teacherId: { type: "string", example: "5" },
                thumbnailPath: { type: "string", example: "/images/class.jpg" },
                schoolId: { type: "string", example: "1" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Classroom created successfully" },
        400: { description: "Bad request - missing required fields" },
        409: { description: "Classroom name already exists" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/classrooms/{classroomId}": {
    get: {
      tags: ["Classroom Management"],
      summary: "Get classroom details by ID",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "classroomId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Success" },
        404: { description: "Classroom not found" },
        500: { description: "Internal server error" },
      },
    },
    put: {
      tags: ["Classroom Management"],
      summary: "Update classroom information",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "classroomId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                classCode: { type: "string" },
                classLevel: { type: "string" },
                teacherId: { type: "string" },
                thumbnailPath: { type: "string" },
                status: { type: "string", example: "ACTIVE" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Classroom updated successfully" },
        400: { description: "Bad request" },
        404: { description: "Classroom not found" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Classroom Management"],
      summary: "Delete a classroom",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "classroomId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Classroom deleted successfully" },
        404: { description: "Classroom not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/classrooms/{classroomId}/students": {
    get: {
      tags: ["Classroom Management"],
      summary: "Get list of students in classroom",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "classroomId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
      ],
      responses: {
        200: { description: "Success" },
        404: { description: "Classroom not found" },
        500: { description: "Internal server error" },
      },
    },
    post: {
      tags: ["Classroom Management"],
      summary: "Add student to classroom",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "classroomId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId"],
              properties: {
                studentId: { type: "string", example: "1" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Student added to classroom successfully" },
        400: { description: "Bad request" },
        404: { description: "Student or classroom not found" },
        409: { description: "Student already in classroom" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Classroom Management"],
      summary: "Remove student from classroom",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "classroomId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId"],
              properties: {
                studentId: { type: "string", example: "1" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Student removed from classroom successfully" },
        400: { description: "Bad request" },
        404: { description: "Student not in classroom" },
        500: { description: "Internal server error" },
      },
    },
  },

  // Lesson Management APIs
  "/teaching-management/lessons": {
    post: {
      tags: ["Lesson Management"],
      summary: "Create a new lesson",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["lesson_name", "topic_id", "classroom_id"],
              properties: {
                lesson_name: { type: "string", example: "Bài học 1: Chữ cái" },
                description: {
                  type: "string",
                  example: "Học về các chữ cái cơ bản",
                },
                topic_id: { type: "integer", example: 1 },
                classroom_id: { type: "integer", example: 1 },
                order_number: { type: "integer", example: 1 },
                image_url: {
                  type: "string",
                  example: "https://example.com/image.jpg",
                },
                video_url: {
                  type: "string",
                  example: "https://example.com/video.mp4",
                },
                duration_minutes: { type: "integer", example: 45 },
                difficulty_level: {
                  type: "string",
                  enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
                  example: "BEGINNER",
                },
                vocabulary_count: { type: "integer", example: 10 },
                is_active: { type: "integer", enum: [0, 1], example: 1 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Lesson created successfully" },
        400: { description: "Bad request - Missing required fields" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Only admin and teacher can create" },
        500: { description: "Internal server error" },
      },
    },
    get: {
      tags: ["Lesson Management"],
      summary: "Get all lessons with pagination and filters",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
        {
          name: "q",
          in: "query",
          schema: { type: "string" },
          description: "Search by lesson name",
        },
        { name: "topic_id", in: "query", schema: { type: "integer" } },
        { name: "classroom_id", in: "query", schema: { type: "integer" } },
        {
          name: "difficulty_level",
          in: "query",
          schema: {
            type: "string",
            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
          },
        },
        {
          name: "is_active",
          in: "query",
          schema: { type: "string", enum: ["0", "1"], default: "1" },
        },
      ],
      responses: {
        200: {
          description: "Lessons retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        lesson_id: { type: "integer" },
                        lesson_name: { type: "string" },
                        description: { type: "string" },
                        topic_id: { type: "integer" },
                        classroom_id: { type: "integer" },
                        order_number: { type: "integer" },
                        image_url: { type: "string" },
                        video_url: { type: "string" },
                        duration_minutes: { type: "integer" },
                        difficulty_level: { type: "string" },
                        vocabulary_count: { type: "integer" },
                        is_active: { type: "integer" },
                      },
                    },
                  },
                  pagination: {
                    type: "object",
                    properties: {
                      page: { type: "integer" },
                      limit: { type: "integer" },
                      total: { type: "integer" },
                      totalPages: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/lessons/{lesson_id}": {
    get: {
      tags: ["Lesson Management"],
      summary: "Get lesson by ID",
      parameters: [
        {
          name: "lesson_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Lesson retrieved successfully" },
        404: { description: "Lesson not found" },
        500: { description: "Internal server error" },
      },
    },
    put: {
      tags: ["Lesson Management"],
      summary: "Update lesson",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "lesson_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                lesson_name: { type: "string" },
                description: { type: "string" },
                image_url: { type: "string" },
                video_url: { type: "string" },
                duration_minutes: { type: "integer" },
                difficulty_level: {
                  type: "string",
                  enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
                },
                vocabulary_count: { type: "integer" },
                is_active: { type: "integer", enum: [0, 1] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Lesson updated successfully" },
        400: { description: "Bad request - No updatable fields provided" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Lesson not found" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Lesson Management"],
      summary: "Delete lesson",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "lesson_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Lesson deleted successfully" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Lesson not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/lessons/topic/{topic_id}": {
    get: {
      tags: ["Lesson Management"],
      summary: "Get lessons by topic ID (ordered)",
      parameters: [
        {
          name: "topic_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Lessons retrieved successfully" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Lesson Management"],
      summary: "Delete all lessons of a topic",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "topic_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Lessons deleted successfully" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/lessons/topic/{topic_id}/reorder": {
    put: {
      tags: ["Lesson Management"],
      summary: "Reorder lessons in a topic",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "topic_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["lessons"],
              properties: {
                lessons: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["lesson_id", "order_number"],
                    properties: {
                      lesson_id: { type: "integer" },
                      order_number: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Lessons reordered successfully" },
        400: { description: "Bad request - Invalid data" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/lessons/classroom/{classroom_id}": {
    get: {
      tags: ["Lesson Management"],
      summary: "Get lessons by classroom ID",
      parameters: [
        {
          name: "classroom_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Lessons retrieved successfully" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/lessons/statistics": {
    get: {
      tags: ["Lesson Management"],
      summary: "Get lesson statistics",
      parameters: [
        {
          name: "classroom_id",
          in: "query",
          required: true,
          schema: { type: "integer" },
        },
        {
          name: "topic_id",
          in: "query",
          schema: { type: "integer" },
          description: "Optional filter by topic",
        },
      ],
      responses: {
        200: {
          description: "Statistics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      total_lessons: { type: "integer" },
                      active_lessons: { type: "integer" },
                      inactive_lessons: { type: "integer" },
                      total_vocabulary: { type: "integer" },
                      avg_duration: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Bad request - classroom_id is required" },
        500: { description: "Internal server error" },
      },
    },
  },

  // Vocabulary Management APIs
  "/teaching-management/vocabularies": {
    post: {
      tags: ["Vocabulary Management"],
      summary: "Create a new vocabulary (Word, Sentence, or Paragraph)",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["content", "topic_id"],
              properties: {
                content: { type: "string", example: "Xin chào" },
                description: {
                  type: "string",
                  example: "Nghĩa là hello/goodbye",
                },
                topic_id: { type: "integer", example: 1 },
                classroom_id: { type: "integer", example: 1 },
                vocabulary_type: {
                  type: "string",
                  enum: ["WORD", "SENTENCE", "PARAGRAPH"],
                  example: "WORD",
                },
                images_url: {
                  type: "string",
                  example: "https://example.com/image.jpg",
                },
                videos_url: {
                  type: "string",
                  example: "https://example.com/video.mp4",
                },
                note: { type: "string", example: "Note about pronunciation" },
                is_private: { type: "integer", enum: [0, 1], example: 0 },
                is_active: { type: "integer", enum: [0, 1], example: 1 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Vocabulary created successfully" },
        400: {
          description: "Bad request - Missing required fields or invalid type",
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Only admin and teacher can create" },
        409: { description: "Conflict - Vocabulary already exists" },
        500: { description: "Internal server error" },
      },
    },
    get: {
      tags: ["Vocabulary Management"],
      summary: "Get all vocabularies with pagination and filters",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
        {
          name: "q",
          in: "query",
          schema: { type: "string" },
          description: "Search by content",
        },
        { name: "topic_id", in: "query", schema: { type: "integer" } },
        { name: "classroom_id", in: "query", schema: { type: "integer" } },
        {
          name: "vocabulary_type",
          in: "query",
          schema: { type: "string", enum: ["WORD", "SENTENCE", "PARAGRAPH"] },
        },
        {
          name: "is_private",
          in: "query",
          schema: { type: "string", enum: ["0", "1"] },
        },
        {
          name: "is_active",
          in: "query",
          schema: { type: "string", enum: ["0", "1"], default: "1" },
        },
      ],
      responses: {
        200: {
          description: "Vocabularies retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        vocabulary_id: { type: "integer" },
                        content: { type: "string" },
                        description: { type: "string" },
                        topic_id: { type: "integer" },
                        classroom_id: { type: "integer" },
                        vocabulary_type: { type: "string" },
                        images_url: { type: "string" },
                        videos_url: { type: "string" },
                        is_private: { type: "integer" },
                        is_active: { type: "integer" },
                      },
                    },
                  },
                  pagination: {
                    type: "object",
                    properties: {
                      page: { type: "integer" },
                      limit: { type: "integer" },
                      total: { type: "integer" },
                      totalPages: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/vocabularies/{vocabulary_id}": {
    get: {
      tags: ["Vocabulary Management"],
      summary: "Get vocabulary by ID",
      parameters: [
        {
          name: "vocabulary_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Vocabulary retrieved successfully" },
        404: { description: "Vocabulary not found" },
        500: { description: "Internal server error" },
      },
    },
    put: {
      tags: ["Vocabulary Management"],
      summary: "Update vocabulary",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "vocabulary_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                content: { type: "string" },
                description: { type: "string" },
                images_url: { type: "string" },
                videos_url: { type: "string" },
                note: { type: "string" },
                vocabulary_type: {
                  type: "string",
                  enum: ["WORD", "SENTENCE", "PARAGRAPH"],
                },
                is_private: { type: "integer", enum: [0, 1] },
                is_active: { type: "integer", enum: [0, 1] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Vocabulary updated successfully" },
        400: {
          description:
            "Bad request - No updatable fields provided or invalid type",
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Vocabulary not found" },
        409: { description: "Conflict - Content already exists" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Vocabulary Management"],
      summary: "Delete vocabulary",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "vocabulary_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Vocabulary deleted successfully" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Vocabulary not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/vocabularies/topic/{topic_id}": {
    get: {
      tags: ["Vocabulary Management"],
      summary: "Get vocabularies by topic ID",
      parameters: [
        {
          name: "topic_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Vocabularies retrieved successfully" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Vocabulary Management"],
      summary: "Delete all vocabularies of a topic",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "topic_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Vocabularies deleted successfully" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/vocabularies/classroom/{classroom_id}": {
    get: {
      tags: ["Vocabulary Management"],
      summary: "Get vocabularies by classroom ID",
      parameters: [
        {
          name: "classroom_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Vocabularies retrieved successfully" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/vocabularies/type/{vocabulary_type}": {
    get: {
      tags: ["Vocabulary Management"],
      summary: "Get vocabularies by type (WORD, SENTENCE, PARAGRAPH)",
      parameters: [
        {
          name: "vocabulary_type",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["WORD", "SENTENCE", "PARAGRAPH"] },
        },
        { name: "topic_id", in: "query", schema: { type: "integer" } },
        { name: "classroom_id", in: "query", schema: { type: "integer" } },
        {
          name: "is_active",
          in: "query",
          schema: { type: "string", enum: ["0", "1"] },
        },
      ],
      responses: {
        200: { description: "Vocabularies retrieved successfully" },
        400: { description: "Bad request - Invalid vocabulary type" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/vocabularies/search/by-content": {
    get: {
      tags: ["Vocabulary Management"],
      summary: "Find vocabulary by content (exact match)",
      parameters: [
        {
          name: "content",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Vocabulary found" },
        400: { description: "Bad request - content parameter is required" },
        404: { description: "Vocabulary not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/vocabularies/statistics": {
    get: {
      tags: ["Vocabulary Management"],
      summary: "Get vocabulary statistics",
      parameters: [
        { name: "classroom_id", in: "query", schema: { type: "integer" } },
        { name: "topic_id", in: "query", schema: { type: "integer" } },
      ],
      responses: {
        200: {
          description: "Statistics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      total_vocabularies: { type: "integer" },
                      active_vocabularies: { type: "integer" },
                      inactive_vocabularies: { type: "integer" },
                      word_count: { type: "integer" },
                      sentence_count: { type: "integer" },
                      paragraph_count: { type: "integer" },
                      private_count: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  // Topic Management APIs
  "/teaching-management/topics": {
    post: {
      tags: ["Topic Management"],
      summary: "Create new topic",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: {
                  type: "string",
                  example: "Basic Vocabulary",
                },
                classroom_id: {
                  type: "integer",
                  example: 1,
                },
                image_location: {
                  type: "string",
                  example: "https://example.com/image.jpg",
                },
                description: {
                  type: "string",
                  example: "Introduction to basic vocabulary",
                },
                creator_id: {
                  type: "integer",
                  example: 1,
                },
                is_common: {
                  type: "boolean",
                  example: false,
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Topic created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      topic_id: { type: "integer" },
                      name: { type: "string" },
                      classroom_id: { type: "integer" },
                      image_location: { type: "string" },
                      description: { type: "string" },
                      creator_id: { type: "integer" },
                      is_common: { type: "boolean" },
                      created_at: { type: "string" },
                      updated_at: { type: "string" },
                    },
                  },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Topic name is required" },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" },
      },
    },
    get: {
      tags: ["Topic Management"],
      summary: "Get all topics with pagination and filtering",
      parameters: [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
        {
          name: "classroom_id",
          in: "query",
          schema: { type: "integer" },
        },
        {
          name: "creator_id",
          in: "query",
          schema: { type: "integer" },
        },
        {
          name: "is_common",
          in: "query",
          schema: { type: "boolean" },
        },
      ],
      responses: {
        200: {
          description: "Topics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "array",
                    items: { type: "object" },
                  },
                  total: { type: "integer" },
                  limit: { type: "integer" },
                  offset: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/topics/search/by-name": {
    get: {
      tags: ["Topic Management"],
      summary: "Search topics by name",
      parameters: [
        {
          name: "name",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: {
          description: "Topics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Name parameter is required" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/topics/statistics": {
    get: {
      tags: ["Topic Management"],
      summary: "Get topic statistics",
      parameters: [
        {
          name: "classroom_id",
          in: "query",
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "Topic statistics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      total_topics: { type: "integer" },
                      common_topics: { type: "integer" },
                      private_topics: { type: "integer" },
                    },
                  },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/topics/classroom/{classroom_id}": {
    get: {
      tags: ["Topic Management"],
      summary: "Get topics by classroom ID",
      parameters: [
        {
          name: "classroom_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: {
          description: "Topics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid classroom ID" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/topics/creator/{creator_id}": {
    get: {
      tags: ["Topic Management"],
      summary: "Get topics by creator ID",
      parameters: [
        {
          name: "creator_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: {
          description: "Topics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid creator ID" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/topics/{topic_id}": {
    get: {
      tags: ["Topic Management"],
      summary: "Get topic by ID",
      parameters: [
        {
          name: "topic_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "Topic retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "object" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid topic ID" },
        404: { description: "Topic not found" },
        500: { description: "Internal server error" },
      },
    },
    put: {
      tags: ["Topic Management"],
      summary: "Update topic",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "topic_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                classroom_id: { type: "integer" },
                image_location: { type: "string" },
                description: { type: "string" },
                creator_id: { type: "integer" },
                is_common: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Topic updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "object" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid topic ID or no fields to update" },
        401: { description: "Unauthorized" },
        404: { description: "Topic not found" },
        409: { description: "Topic name already exists" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Topic Management"],
      summary: "Delete topic (Admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "topic_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "Topic deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "object" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid topic ID" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Topic not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  // Question Management APIs
  "/teaching-management/questions": {
    post: {
      tags: ["Question Management"],
      summary: "Create new question",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["content"],
              properties: {
                content: {
                  type: "string",
                  example: 'What is the sign for "hello"?',
                },
                explanation: {
                  type: "string",
                  example:
                    "The sign for hello involves waving your hand from left to right",
                },
                class_room_id: {
                  type: "integer",
                  example: 1,
                },
                image_location: {
                  type: "string",
                  example: "https://example.com/question-image.jpg",
                },
                video_location: {
                  type: "string",
                  example: "https://example.com/question-video.mp4",
                },
                created_by: {
                  type: "integer",
                  example: 1,
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Question created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      question_id: { type: "integer" },
                      content: { type: "string" },
                      explanation: { type: "string" },
                      class_room_id: { type: "integer" },
                      image_location: { type: "string" },
                      video_location: { type: "string" },
                      created_by: { type: "integer" },
                      created_at: { type: "string" },
                      updated_at: { type: "string" },
                    },
                  },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Question content is required" },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" },
      },
    },
    get: {
      tags: ["Question Management"],
      summary: "Get all questions with pagination and filtering",
      parameters: [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
        {
          name: "classroom_id",
          in: "query",
          schema: { type: "integer" },
        },
        {
          name: "creator_id",
          in: "query",
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "Questions retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "array",
                    items: { type: "object" },
                  },
                  total: { type: "integer" },
                  limit: { type: "integer" },
                  offset: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/questions/search/by-content": {
    get: {
      tags: ["Question Management"],
      summary: "Search questions by content",
      parameters: [
        {
          name: "content",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: {
          description: "Questions retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Content parameter is required" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/questions/statistics": {
    get: {
      tags: ["Question Management"],
      summary: "Get question statistics",
      parameters: [
        {
          name: "classroom_id",
          in: "query",
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "Question statistics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      total_questions: { type: "integer" },
                      questions_with_image: { type: "integer" },
                      questions_with_video: { type: "integer" },
                    },
                  },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/questions/classroom/{classroom_id}": {
    get: {
      tags: ["Question Management"],
      summary: "Get questions by classroom ID",
      parameters: [
        {
          name: "classroom_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: {
          description: "Questions retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid classroom ID" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/questions/creator/{creator_id}": {
    get: {
      tags: ["Question Management"],
      summary: "Get questions by creator ID",
      parameters: [
        {
          name: "creator_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: {
          description: "Questions retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid creator ID" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/questions/{question_id}": {
    get: {
      tags: ["Question Management"],
      summary: "Get question by ID",
      parameters: [
        {
          name: "question_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "Question retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "object" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid question ID" },
        404: { description: "Question not found" },
        500: { description: "Internal server error" },
      },
    },
    put: {
      tags: ["Question Management"],
      summary: "Update question",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "question_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                content: { type: "string" },
                explanation: { type: "string" },
                class_room_id: { type: "integer" },
                image_location: { type: "string" },
                video_location: { type: "string" },
                created_by: { type: "integer" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Question updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "object" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid question ID or no fields to update" },
        401: { description: "Unauthorized" },
        404: { description: "Question not found" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Question Management"],
      summary: "Delete question (Admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "question_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "Question deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "object" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid question ID" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Question not found" },
        500: { description: "Internal server error" },
      },
    },
  },

  // Exam Management APIs
  "/teaching-management/exams": {
    post: {
      tags: ["Exam Management"],
      summary: "Create new exam",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: {
                  type: "string",
                  example: "Sign Language Test Week 1",
                },
                description: {
                  type: "string",
                  example: "Test on basic sign language vocabulary and grammar",
                },
                exam_type: {
                  type: "string",
                  enum: ["MULTIPLE_CHOICE", "PRACTICAL"],
                  example: "MULTIPLE_CHOICE",
                },
                class_room_id: {
                  type: "integer",
                  example: 1,
                },
                created_by: {
                  type: "integer",
                  example: 1,
                },
                duration_minutes: {
                  type: "integer",
                  example: 60,
                },
                total_points: {
                  type: "integer",
                  example: 100,
                },
                passing_score: {
                  type: "integer",
                  example: 50,
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Exam created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "object" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: { description: "Invalid exam type or name is required" },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" },
      },
    },
    get: {
      tags: ["Exam Management"],
      summary: "Get all exams with pagination and filtering",
      parameters: [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
        { name: "classroom_id", in: "query", schema: { type: "integer" } },
        { name: "creator_id", in: "query", schema: { type: "integer" } },
        {
          name: "exam_type",
          in: "query",
          schema: { type: "string", enum: ["MULTIPLE_CHOICE", "PRACTICAL"] },
        },
        { name: "is_active", in: "query", schema: { type: "boolean" } },
      ],
      responses: {
        200: {
          description: "Exams retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/exams/statistics": {
    get: {
      tags: ["Exam Management"],
      summary: "Get exam statistics",
      parameters: [
        { name: "classroom_id", in: "query", schema: { type: "integer" } },
        { name: "exam_type", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Exam statistics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      total_exams: { type: "integer" },
                      active_exams: { type: "integer" },
                      inactive_exams: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/exams/classroom/{classroom_id}": {
    get: {
      tags: ["Exam Management"],
      summary: "Get exams by classroom",
      parameters: [
        {
          name: "classroom_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: { description: "Exams retrieved successfully" },
        400: { description: "Invalid classroom ID" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/exams/creator/{creator_id}": {
    get: {
      tags: ["Exam Management"],
      summary: "Get exams by creator",
      parameters: [
        {
          name: "creator_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: { description: "Exams retrieved successfully" },
        400: { description: "Invalid creator ID" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/exams/type/{exam_type}": {
    get: {
      tags: ["Exam Management"],
      summary: "Get exams by type",
      parameters: [
        {
          name: "exam_type",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["MULTIPLE_CHOICE", "PRACTICAL"] },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: { description: "Exams retrieved successfully" },
        400: { description: "Invalid exam type" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/exams/{exam_id}/submit": {
    post: {
      tags: ["Exam Management"],
      summary: "Submit exam (Student only)",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "exam_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["student_id"],
              properties: {
                student_id: { type: "integer" },
                score: { type: "number" },
                answers: { type: "object" },
                time_spent: { type: "integer" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Exam submitted successfully" },
        400: { description: "Invalid exam ID or student ID required" },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/exams/{exam_id}/results": {
    get: {
      tags: ["Exam Management"],
      summary: "Get exam results",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "exam_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
        { name: "student_id", in: "query", schema: { type: "integer" } },
      ],
      responses: {
        200: { description: "Exam results retrieved successfully" },
        400: { description: "Invalid exam ID" },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/exams/student/{student_id}/attempts": {
    get: {
      tags: ["Exam Management"],
      summary: "Get student exam attempts",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "student_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
        },
      ],
      responses: {
        200: { description: "Student exam attempts retrieved successfully" },
        400: { description: "Invalid student ID" },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" },
      },
    },
  },

  "/teaching-management/exams/{exam_id}": {
    get: {
      tags: ["Exam Management"],
      summary: "Get exam by ID",
      parameters: [
        {
          name: "exam_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Exam retrieved successfully" },
        400: { description: "Invalid exam ID" },
        404: { description: "Exam not found" },
        500: { description: "Internal server error" },
      },
    },
    put: {
      tags: ["Exam Management"],
      summary: "Update exam (Teacher/Admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "exam_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                exam_type: {
                  type: "string",
                  enum: ["MULTIPLE_CHOICE", "PRACTICAL"],
                },
                class_room_id: { type: "integer" },
                duration_minutes: { type: "integer" },
                total_points: { type: "integer" },
                passing_score: { type: "integer" },
                is_active: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Exam updated successfully" },
        400: { description: "Invalid exam ID or no fields to update" },
        401: { description: "Unauthorized" },
        404: { description: "Exam not found" },
        500: { description: "Internal server error" },
      },
    },
    delete: {
      tags: ["Exam Management"],
      summary: "Delete exam (Teacher/Admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "exam_id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: { description: "Exam deleted successfully" },
        400: { description: "Invalid exam ID" },
        401: { description: "Unauthorized" },
        404: { description: "Exam not found" },
        500: { description: "Internal server error" },
      },
    },
  },
  // Learning Progress Management APIs
  "/teaching-management/progress/my-progress": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get student's own learning progress",
      description: "Học sinh xem tiến độ học tập của chính mình",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Student progress retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      student: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          full_name: { type: "string" },
                          email: { type: "string" },
                        },
                      },
                      exam_progress: {
                        type: "object",
                        properties: {
                          total_exams: { type: "integer", example: 5 },
                          passed_exams: { type: "integer", example: 4 },
                          failed_exams: { type: "integer", example: 1 },
                          average_score: { type: "number", example: 78.5 },
                          highest_score: { type: "integer", example: 90 },
                          lowest_score: { type: "integer", example: 65 },
                          pass_rate: { type: "integer", example: 80 },
                        },
                      },
                      lesson_progress: {
                        type: "object",
                        properties: {
                          total_lessons: { type: "integer", example: 10 },
                          completed_lessons: { type: "integer", example: 8 },
                          remaining_lessons: { type: "integer", example: 2 },
                          completion_rate: { type: "integer", example: 80 },
                        },
                      },
                      vocabulary_progress: {
                        type: "object",
                        properties: {
                          total_vocabularies: { type: "integer", example: 100 },
                          learned_vocabularies: {
                            type: "integer",
                            example: 75,
                          },
                          remaining_vocabularies: {
                            type: "integer",
                            example: 25,
                          },
                          learning_rate: { type: "integer", example: 75 },
                        },
                      },
                      overall_progress: { type: "integer", example: 78 },
                      last_updated: { type: "string", format: "date-time" },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Lấy tiến độ học tập thành công",
                  },
                },
              },
            },
          },
        },
        401: {
          description: "Unauthorized - Student not authenticated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: {
                    type: "string",
                    example: "Lỗi khi lấy tiến độ học tập",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/teaching-management/progress/student/{studentId}": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get specific student's learning progress (Teacher/Admin view)",
      description: "Giáo viên, Admin xem tiến độ học tập của từng học sinh",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "studentId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Student ID",
        },
      ],
      responses: {
        200: {
          description: "Student progress retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      student: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          full_name: { type: "string" },
                          email: { type: "string" },
                        },
                      },
                      exam_progress: {
                        type: "object",
                        properties: {
                          total_exams: { type: "integer" },
                          passed_exams: { type: "integer" },
                          failed_exams: { type: "integer" },
                          average_score: { type: "number" },
                          highest_score: { type: "integer" },
                          lowest_score: { type: "integer" },
                          pass_rate: { type: "integer" },
                        },
                      },
                      lesson_progress: {
                        type: "object",
                        properties: {
                          total_lessons: { type: "integer" },
                          completed_lessons: { type: "integer" },
                          remaining_lessons: { type: "integer" },
                          completion_rate: { type: "integer" },
                        },
                      },
                      vocabulary_progress: {
                        type: "object",
                        properties: {
                          total_vocabularies: { type: "integer" },
                          learned_vocabularies: { type: "integer" },
                          remaining_vocabularies: { type: "integer" },
                          learning_rate: { type: "integer" },
                        },
                      },
                      overall_progress: { type: "integer" },
                      last_updated: { type: "string", format: "date-time" },
                    },
                  },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        400: {
          description: "Missing student ID",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string", example: "Missing student ID" },
                  message: { type: "string", example: "Thiếu ID học sinh" },
                },
              },
            },
          },
        },
        403: {
          description:
            "Forbidden - Only teacher/admin can view student progress",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        404: {
          description: "Student not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string", example: "Student not found" },
                  message: {
                    type: "string",
                    example: "Không tìm thấy học sinh",
                  },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/teaching-management/progress/student/{studentId}/exams": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get student's exam history",
      description: "Lấy lịch sử bài kiểm tra của học sinh",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "studentId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Student ID",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
          description: "Number of records to return",
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
          description: "Number of records to skip",
        },
      ],
      responses: {
        200: {
          description: "Exam history retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      student_id: { type: "string" },
                      exam_history: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            exam_attempt_id: { type: "string" },
                            exam_id: { type: "string" },
                            exam_name: { type: "string" },
                            exam_type: {
                              type: "string",
                              enum: ["MULTIPLE_CHOICE", "PRACTICAL"],
                            },
                            total_points: { type: "integer" },
                            passing_score: { type: "integer" },
                            score: { type: "integer" },
                            time_spent_minutes: { type: "integer" },
                            created_at: { type: "string", format: "date-time" },
                          },
                        },
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                        },
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Lấy lịch sử bài kiểm tra thành công",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/teaching-management/progress/student/{studentId}/lessons": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get student's lesson progress",
      description: "Lấy tiến độ bài học của học sinh",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "studentId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Student ID",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
          description: "Number of records to return",
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
          description: "Number of records to skip",
        },
      ],
      responses: {
        200: {
          description: "Lesson progress retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      student_id: { type: "string" },
                      lesson_progress: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            user_lesson_id: { type: "string" },
                            lesson_id: { type: "string" },
                            lesson_name: { type: "string" },
                            description: { type: "string" },
                            is_completed: { type: "boolean" },
                            completed_at: {
                              type: "string",
                              format: "date-time",
                            },
                            created_at: { type: "string", format: "date-time" },
                            updated_at: { type: "string", format: "date-time" },
                          },
                        },
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                        },
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Lấy tiến độ bài học thành công",
                  },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/teaching-management/progress/student/{studentId}/vocabularies": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get student's vocabulary progress",
      description: "Lấy tiến độ từ vựng của học sinh",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "studentId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Student ID",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
          description: "Number of records to return",
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
          description: "Number of records to skip",
        },
      ],
      responses: {
        200: {
          description: "Vocabulary progress retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      student_id: { type: "string" },
                      vocabulary_progress: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            user_vocabulary_id: { type: "string" },
                            vocabulary_id: { type: "string" },
                            vocabulary_word: { type: "string" },
                            meaning: { type: "string" },
                            example: { type: "string" },
                            is_learned: { type: "boolean" },
                            learned_at: { type: "string", format: "date-time" },
                            created_at: { type: "string", format: "date-time" },
                            updated_at: { type: "string", format: "date-time" },
                          },
                        },
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                        },
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Lấy tiến độ từ vựng thành công",
                  },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/teaching-management/progress/classroom/{classroomId}/summary": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get classroom progress summary (Teacher/Admin)",
      description: "Lấy tóm tắt tiến độ học tập của tất cả học sinh trong lớp",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "classroomId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Classroom ID",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 50 },
          description: "Number of students to return",
        },
        {
          name: "offset",
          in: "query",
          schema: { type: "integer", default: 0 },
          description: "Number of students to skip",
        },
      ],
      responses: {
        200: {
          description: "Classroom progress summary retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      classroom_id: { type: "string" },
                      students_progress: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            student_id: { type: "string" },
                            full_name: { type: "string" },
                            email: { type: "string" },
                            total_exams: { type: "integer" },
                            passed_exams: { type: "integer" },
                            average_exam_score: { type: "number" },
                            completed_lessons: { type: "integer" },
                            learned_vocabularies: { type: "integer" },
                          },
                        },
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                        },
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Lấy tóm tắt tiến độ lớp học thành công",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Missing classroom ID",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        403: {
          description:
            "Forbidden - Only teacher/admin can view classroom progress",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/teaching-management/progress/student/{studentId}/classroom/{classroomId}": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get student's progress in specific classroom",
      description: "Lấy tiến độ học tập của học sinh trong một lớp cụ thể",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "studentId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Student ID",
        },
        {
          name: "classroomId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Classroom ID",
        },
      ],
      responses: {
        200: {
          description: "Student classroom progress retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      classroom_id: { type: "string" },
                      exam_stats: {
                        type: "object",
                        properties: {
                          total_exams: { type: "integer" },
                          passed_exams: { type: "integer" },
                          average_score: { type: "number" },
                        },
                      },
                      lesson_stats: {
                        type: "object",
                        properties: {
                          total_lessons: { type: "integer" },
                          completed_lessons: { type: "integer" },
                        },
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Lấy tiến độ theo lớp học thành công",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Missing student ID or classroom ID",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/teaching-management/progress/student/{studentId}/date-range": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get student's progress by date range",
      description: "Lấy tiến độ học tập của học sinh theo khoảng thời gian",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "studentId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Student ID",
        },
        {
          name: "start_date",
          in: "query",
          required: true,
          schema: { type: "string", format: "date" },
          description: "Start date (YYYY-MM-DD)",
        },
        {
          name: "end_date",
          in: "query",
          required: true,
          schema: { type: "string", format: "date" },
          description: "End date (YYYY-MM-DD)",
        },
      ],
      responses: {
        200: {
          description: "Progress by date range retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      student_id: { type: "string" },
                      date_range: {
                        type: "object",
                        properties: {
                          start_date: { type: "string", format: "date" },
                          end_date: { type: "string", format: "date" },
                        },
                      },
                      daily_progress: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            activity_date: { type: "string", format: "date" },
                            total_activities: { type: "integer" },
                            completed_activities: { type: "integer" },
                            average_score: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Lấy tiến độ theo khoảng thời gian thành công",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Missing required parameters",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/teaching-management/progress/student/{studentId}/classroom/{classroomId}/comparison":
    {
      get: {
        tags: ["Learning Progress Management"],
        summary: "Get student's progress compared to classroom average",
        description:
          "So sánh tiến độ học tập của học sinh với trung bình của lớp",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "studentId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Student ID",
          },
          {
            name: "classroomId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Classroom ID",
          },
        ],
        responses: {
          200: {
            description: "Progress comparison retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        student_performance: {
                          type: "object",
                          properties: {
                            classroom_id: { type: "string" },
                            exam_stats: {
                              type: "object",
                              properties: {
                                total_exams: { type: "integer" },
                                passed_exams: { type: "integer" },
                                average_score: { type: "number" },
                              },
                            },
                            lesson_stats: {
                              type: "object",
                              properties: {
                                total_lessons: { type: "integer" },
                                completed_lessons: { type: "integer" },
                              },
                            },
                          },
                        },
                        classroom_average: {
                          type: "object",
                          properties: {
                            average_exam_score: { type: "number" },
                            average_lesson_rate: { type: "number" },
                          },
                        },
                        comparison: {
                          type: "object",
                          properties: {
                            exam_score_difference: { type: "number" },
                          },
                        },
                      },
                    },
                    message: {
                      type: "string",
                      example: "Lấy so sánh tiến độ thành công",
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Missing required parameters",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    error: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  "/teaching-management/progress/student/{studentId}/trends": {
    get: {
      tags: ["Learning Progress Management"],
      summary: "Get student's learning trends",
      description: "Lấy xu hướng học tập của học sinh theo tuần",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "studentId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Student ID",
        },
        {
          name: "weeks",
          in: "query",
          schema: { type: "integer", default: 8 },
          description: "Number of weeks to analyze",
        },
      ],
      responses: {
        200: {
          description: "Learning trends retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      student_id: { type: "string" },
                      weeks: { type: "integer" },
                      learning_trends: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            week_number: { type: "integer" },
                            year: { type: "integer" },
                            exams_taken: { type: "integer" },
                            average_score: { type: "number" },
                            passed_exams: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Lấy xu hướng học tập thành công",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Missing student ID",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        500: {
          description: "Server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  error: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },

  // Learn Feature APIs
  "/learn/categories": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get list of categories",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/learn/categories/{slug}": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get category by slug",
      parameters: [
        {
          name: "slug",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
        404: { description: "Category not found" },
      },
    },
  },
  "/learn/items/{itemId}": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get item by ID",
      parameters: [
        {
          name: "itemId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/items/{itemId}/lessons": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get lessons for an item",
      parameters: [
        {
          name: "itemId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/lessons/{lessonId}": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get lesson by ID",
      parameters: [
        {
          name: "lessonId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/lessons/{lessonId}/steps": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get steps for a lesson",
      parameters: [
        {
          name: "lessonId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/search": {
    get: {
      tags: ["Learn Feature"],
      summary: "Search items",
      parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/topics": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get topics for learning",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/topics/{topicId}": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get topic with vocabularies",
      parameters: [
        {
          name: "topicId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/topics/{topicId}/steps": {
    get: {
      tags: ["Learn Feature"],
      summary: "Get topic learning steps",
      parameters: [
        {
          name: "topicId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/progress": {
    get: {
      tags: ["Learn Progress"],
      summary: "Get user progress",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
    post: {
      tags: ["Learn Progress"],
      summary: "Update student progress",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object" } } },
      },
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/progress/{itemId}": {
    get: {
      tags: ["Learn Progress"],
      summary: "Get item progress",
      parameters: [
        {
          name: "itemId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/vocabulary/learned": {
    post: {
      tags: ["Learn Progress"],
      summary: "Mark vocabulary as learned",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object" } } },
      },
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/learn/vocabulary/progress": {
    get: {
      tags: ["Learn Progress"],
      summary: "Get vocabulary progress",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/upload": {
    post: {
      tags: ["Upload"],
      summary: "Upload a file",
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                file: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Success" },
      },
    },
  },
  "/ai-practice/predict": {
    post: {
      tags: ["AI Practice"],
      summary: "Predict sign from uploaded file and save attempt history",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: { type: "string", format: "binary" },
                mode: {
                  type: "string",
                  enum: ["match", "spell", "free"],
                  default: "match",
                },
                target_text: { type: "string", example: "Xin chao" },
                vocabulary_id: { type: "integer", example: 101 },
                topic_id: { type: "integer", example: 12 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Prediction success" },
        400: { description: "Invalid input" },
        401: { description: "Unauthorized" },
        413: { description: "File too large" },
        415: { description: "Unsupported media type" },
        422: { description: "Model rejected request" },
        502: { description: "Upstream AI service failed" },
        504: { description: "Upstream AI service timeout" },
      },
    },
  },
  "/ai-practice/history": {
    get: {
      tags: ["AI Practice"],
      summary: "Get authenticated user's AI practice history",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
      ],
      responses: {
        200: { description: "Success" },
        401: { description: "Unauthorized" },
      },
    },
  },
};

module.exports = swaggerDocs;
