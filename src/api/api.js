import axios from "axios";

export default axios.create({
  baseURL: "https://api.openai.com/v1",
});
