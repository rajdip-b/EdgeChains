import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Message } from "../util/message";
import rateLimit from 'axios-rate-limit';
import axiosRetry from "axios-retry";

export interface EdgeChainEndpointParams {
    maxRetries?: number;
    timeout?: number;
    apiKey: string;
    apiBase: string;
    rpm?: number;
    tpm?: number;
    temperature?: number;
    tokens?: number;
    topP?: number;
    topK?: number;
}

export interface ChatCompletionResponse {
    id: string;
    created: number;
    message: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }
}

export interface EdgeChainsEmbeddingOptions {

}

export interface ChatCompletionWithStreamResponse {
    id: string;
    created: number;
    message: Message;
}

export interface EdgeChainsEmbeddingsResponse {
    embeddings: string[];
    usage?: {
        promptTokens: number;
        totalTokens: number;
    }
}

export const getAxios = ({
    maxRetries,
    timeout,
    rpm,
    onRetry
}: {
    maxRetries: number;
    timeout: number;
    rpm: number;
    onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>;
}) => {
    const http = rateLimit(axios.create(), {
        maxRequests: rpm,
        perMilliseconds: 60000,
    });

    axiosRetry(http, {
        retries: maxRetries,
        retryDelay: axiosRetry.exponentialDelay,
        onRetry
    })

    http.defaults.timeout = timeout;

    return http;
}

export interface EdgeChainsEndpoint {

    chatCompletion(
        message: string | Message[], 
        onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
        : Promise<ChatCompletionResponse> 

    chatCompletionWithStream(
        message: string, 
        onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
        : Promise<ChatCompletionWithStreamResponse>;

    getEmbeddings(
        input: string | string[], 
        options: EdgeChainsEmbeddingOptions, 
        onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
        : Promise<EdgeChainsEmbeddingsResponse>;

    // encode(text: string): Promise<string>;

    // decode(text: string | string[]): Promise<string>;

    // tokenCounter(messages: IMessage[]): Promise<number>;

    setMaxRetries(maxRetries: number): void;

    setTimeout(timeout: number): void;

    getAvailableLimits(): { tpmRemaining: number; rpmRemaining: number; }
}