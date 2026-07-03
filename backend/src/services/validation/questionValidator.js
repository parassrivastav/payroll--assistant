const MAX_QUESTION_LENGTH = 500;

function validateQuestion(question) {
  if (typeof question !== "string") {
    throwValidationError("question must be a string.");
  }

  const normalized = question.trim();
  if (!normalized) {
    throwValidationError("question is required.");
  }

  if (normalized.length > MAX_QUESTION_LENGTH) {
    throwValidationError(`question must be ${MAX_QUESTION_LENGTH} characters or fewer.`);
  }

  return normalized;
}

function throwValidationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = "INVALID_QUESTION";
  throw err;
}

module.exports = {
  MAX_QUESTION_LENGTH,
  validateQuestion
};
