import { Base } from "./base";

export class TopicModel extends Base {
  constructor() {
    super("teaching-management/topics");
  }

  getTopics = async (query?: any) => {
    const res = await this.apiGet("", query);
    return res.data;
  };

  getTopicsByClassroom = async (classroomId: number) => {
    const res = await this.apiGet(`/classroom/${classroomId}`);
    return res.data;
  };

  getMyTopics = async () => {
    const res = await this.apiGet("/mine");
    return res.data;
  };

  getAvailableTopics = async (classroomId: number) => {
    const res = await this.apiGet(`/classroom/${classroomId}/available`);
    return res.data;
  };

  assignTopics = async (classroomId: number, topicIds: number[]) => {
    const res = await this.apiPost(`/classroom/${classroomId}/assign`, {
      topic_ids: topicIds,
    });
    return res.data;
  };

  removeTopicFromClassroom = async (classroomId: number, topicId: number) => {
    const res = await this.apiDelete(`/classroom/${classroomId}/${topicId}`);
    return res.data;
  };

  getTopicVocabularies = async (topicId: number) => {
    const res = await this.apiGet(`/${topicId}/vocabularies`);
    return res.data;
  };

  replaceTopicVocabularies = async (
    topicId: number,
    vocabularyIds: number[],
  ) => {
    const res = await this.apiPut(`/${topicId}/vocabularies`, {
      vocabulary_ids: vocabularyIds,
    });
    return res.data;
  };

  getTopicById = async (id: number) => {
    const res = await this.apiGet(`/${id}`);
    return res.data;
  };

  getTopicStudentStatistics = async (classroomId: number, topicId: number) => {
    const res = await this.apiGet(`/classroom/${classroomId}/${topicId}/statistics`);
    return res.data;
  };

  createTopic = async (data: any) => {
    const res = await this.apiPost("", data);
    return res.data;
  };

  updateTopic = async (id: number, data: any) => {
    const res = await this.apiPut(`/${id}`, data);
    return res.data;
  };

  deleteTopic = async (id: number) => {
    const res = await this.apiDelete(`/${id}`);
    return res.data;
  };
}

const Topics = new TopicModel();
export default Topics;
