const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dataPath = path.join(__dirname, "../src/scripts/curriculum_lop1_data.json");
const publicPath = path.join(__dirname, "../../frontend/public");
const lessons = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const activities = lessons.flatMap((lesson) => lesson.activities || []);

test("curriculum seed has complete game configuration and usable media paths", () => {
  assert.equal(lessons.length, 5);
  assert.equal(activities.length, 33);

  const mediaCodes = new Set();
  for (const activity of activities) {
    assert.ok(activity.media.length > 0, `${activity.activity_code} has no media`);
    assert.ok(Array.isArray(activity.game_config.targetWords), `${activity.activity_code} has no labels`);
    assert.equal(
      activity.media.length,
      activity.game_config.targetWords.length,
      `${activity.activity_code} labels/media mismatch`,
    );

    for (const media of activity.media) {
      assert.ok(!media.source_url.includes("/videos/"), `${media.media_code} still uses a missing placeholder`);
      assert.ok(
        !media.source_url.includes("qipedc.moet.gov.vn/dictionary"),
        `${media.media_code} uses a dictionary page as playable media`,
      );
      if (media.source_url.startsWith("/")) {
        const localPath = path.join(publicPath, media.source_url.replace(/^\/+/, ""));
        assert.ok(fs.existsSync(localPath), `${media.media_code} points to missing file ${media.source_url}`);
      }
      assert.ok(!mediaCodes.has(media.media_code), `${media.media_code} is duplicated`);
      mediaCodes.add(media.media_code);
    }

    const requiredConfig = {
      LineMatchingGame: "pairs",
      ChoiceQuizGame: "questions",
      BucketDropGame: "buckets",
      SequenceOrderGame: "sequence",
    }[activity.game_type];
    if (requiredConfig) {
      assert.ok(
        Array.isArray(activity.game_config[requiredConfig]) && activity.game_config[requiredConfig].length > 0,
        `${activity.activity_code} is missing ${requiredConfig}`,
      );
    }
  }
});
