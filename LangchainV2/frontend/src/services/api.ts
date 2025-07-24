import axios from "axios";
import { ApiUrl } from "../environment";

export const api = axios.create({
    baseURL: `${ApiUrl}`,
});
    

axios.interceptors.request.use(function(config){
    return config;
}, function(error){
    return Promise.reject(error);
});

axios.interceptors.response.use(function(response){
    return response;
}, function(error){
    return Promise.reject(error);
})