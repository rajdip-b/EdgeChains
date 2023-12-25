import { AxiosError, AxiosRequestConfig } from "axios";
import { Message } from "../util/message";
import { EdgeChainsEndpoint, ChatCompletionResponse, ChatCompletionWithStreamResponse, EdgeChainEndpointParams, EdgeChainsEmbeddingOptions, EdgeChainsEmbeddingsResponse, getAxios } from "./EdgeChainsEndpoint";

export interface GooglePalmEndpointParams extends EdgeChainEndpointParams {
    model: 'embedding-gecko-001' | 'chat-bison-001'
}

export class GooglePalmEndpoint implements EdgeChainsEndpoint {
    tpmRemaining: number = 0;
    rpmRemaining: number = 0;
    messages: Message[] = [];

    constructor(public params: GooglePalmEndpointParams) {
        this.params.maxRetries = this.params.maxRetries || 3;
        this.params.timeout = this.params.timeout || 30000;
        this.params.temperature = this.params.temperature || 0.7;
        this.params.tpm = this.params.tpm || 8196;
        this.params.topP = this.params.topP || 0.75;
        this.params.topK = this.params.topK || 0;

        switch (this.params.model) {
            case "embedding-gecko-001":
                this.params.tokens = this.params.tokens || 3072;
                this.params.rpm = this.params.rpm || 150;
            case "chat-bison-001":
                this.params.tokens = this.params.tokens || 5120;
                this.params.rpm = this.params.rpm || 90;
        }

        setInterval(() => {
            this.rpmRemaining = this.params.rpm!;
            this.tpmRemaining = this.params.tpm!;
        }, 60000);
    }

    async chatCompletion(
        message: string, 
        onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
        : Promise<ChatCompletionResponse> {
        if (this.params.model === "embedding-gecko-001") {
            throw new Error("chatCompletion is not supported for embedding-gecko-001");
        }

        const {data, status, statusText} = await getAxios({
            maxRetries: this.params.maxRetries!,
            timeout: this.params.timeout!,
            rpm: this.params.rpm!,
            onRetry
        }).post(`${this.params.apiBase}/models/${this.params.model}:generateMessage?key=${this.params.apiKey}`, {
            prompt: {
                messages: this.messages.map(message => ({
                    author: message.role,
                    content: message.content,
                })),
            },
            temperature: this.params.temperature,
        });
        
        if (status !== 200) {
            throw new Error(`Request failed with status ${status}: ${statusText}`);
        }

        const chatCompletionResponse: ChatCompletionResponse = {
            id: Date.now().toString(),
            created: Date.now(),
            message: data.candidates[0].content
        }

        this.messages.push(...[
            {
                role: '0',
                content: message,
            },
            {
                role: '1',
                content: chatCompletionResponse.message,
            }
        ])
        // TODO: Figure out how to get the number of tokens used
        // this.processRequest(chatCompletionResponse.usage.totalTokens);

        return chatCompletionResponse;
    }

    chatCompletionWithStream(
        message: string,
        onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
        : Promise<ChatCompletionWithStreamResponse> {
        throw new Error("Method not implemented.");
    }

    async getEmbeddings(
        input: string | string[],
        _?: EdgeChainsEmbeddingOptions,
        onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
        : Promise<EdgeChainsEmbeddingsResponse> {
            if (this.params.model === "chat-bison-001") {
                throw new Error("getEmbeddings is not supported for chat-bison-001");
            }

            let i = Array.isArray(input) ? input.join("\n") : input; // Since Google PaLM only supports one input at a time, we need to join the array

            const {data, status, statusText} = await getAxios({
                maxRetries: this.params.maxRetries!,
                timeout: this.params.timeout!,
                rpm: this.params.rpm!,
                onRetry
            }).post(`${this.params.apiBase}/models/${this.params.model}:embedText?key=${this.params.apiKey}`, {
                input: i,
            });

            if (status !== 200) {
                throw new Error(`Request failed with status ${status}: ${statusText}`);
            }

            const embeddingsResponse: EdgeChainsEmbeddingsResponse = {
                embeddings: data.embedding.value
            }

            return embeddingsResponse;
    }

    setMaxRetries(maxRetries: number): void {
        this.params.maxRetries = maxRetries;
    }

    setTimeout(timeout: number): void {
        this.params.timeout = timeout;
    }

    getAvailableLimits(): {
        tpmRemaining: number;
        rpmRemaining: number;
    } {
        return {
            tpmRemaining: this.tpmRemaining,
            rpmRemaining: this.rpmRemaining,
        }
    }

    private processRequest(tokensUsed: number): void {
        this.rpmRemaining -= 1;
        this.tpmRemaining -= tokensUsed;
    }
    
}