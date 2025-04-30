import { upload } from "../utils/multer.js";

export const uploadMiddleware = upload.fields([
  { name: "images", maxCount: 5 },
  { name: "roomModels", maxCount: 5 },
]);
