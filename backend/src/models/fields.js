export const publicId = {
  transform(doc, json) {
    json.id = doc.id;
    delete json._id;
    delete json.__v;
    return json;
  },
};

export const integerField = (min, max) => ({
  type: Number, required: true, min, max, validate: Number.isInteger,
});
