import { AxiosError, AxiosRequestConfig } from "axios";
import { Message } from "../util/message";
import { EdgeChainsEndpoint, ChatCompletionResponse, ChatCompletionWithStreamResponse, EdgeChainEndpointParams, EdgeChainsEmbeddingOptions, EdgeChainsEmbeddingsResponse, getAxios } from "./EdgeChainsEndpoint";

export interface CohereEndpointParams extends EdgeChainEndpointParams {
    model: 'command' | 'command-light' | 'embed-english-v2.0' | 'embed-english-light-v2.0' | 'embed-english-v3.0' | 'embed-english-light-v3.0';
}

export interface CohereEmbeddingOptions extends EdgeChainsEmbeddingOptions {
    inputType: "search_document" | "search_query" | "classification" | "clustering";
    embedding_types?: ("float" | "int8" | "uint8" | "binary" | "ubinary") []
    truncate?: "NONE" | "START" | "END";
}

export class CohereEndpoint implements EdgeChainsEndpoint {
    tpmRemaining: number = 0;
    rpmRemaining: number = 0;
    messages: Message[] = [];
    // Cohere uses this to track conversations (alternative to sending large message blocks)
    conversationId: string = ""; 

    constructor(public params: CohereEndpointParams) {
        this.params.maxRetries = this.params.maxRetries || 3;
        this.params.timeout = this.params.timeout || 30000;
        this.params.temperature = this.params.temperature || 0.75;
        this.params.tpm = this.params.tpm || 2000;
        this.params.rpm = this.params.rpm || 10000;
        this.params.topP = this.params.topP || 0.75;
        this.params.topK = this.params.topK || 0;
        this.conversationId = new Date().getTime().toString();

        switch (this.params.model) {
            case "command":
                this.params.tokens = this.params.tokens || 4096;
            case "command-light":
                this.params.tokens = this.params.tokens || 4096;
            case "embed-english-v2.0":
                this.params.tokens = this.params.tokens || 512;
            case "embed-english-light-v2.0":
                this.params.tokens = this.params.tokens || 512;
            case "embed-english-v3.0":
                this.params.tokens = this.params.tokens || 512;
            case "embed-english-light-v3.0":
                this.params.tokens = this.params.tokens || 512;
        }

        setInterval(() => {
            this.rpmRemaining = this.params.rpm!;
            this.tpmRemaining = this.params.tpm!;
        }, 60000);
    }

    async chatCompletion(
        message: string | Message[], 
        onRetry?: ((retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig<any>) => Promise<void>) | undefined)
        : Promise<ChatCompletionResponse> {
        if (this.params.model !== "command" && this.params.model !== "command-light") {
            throw new Error("chatCompletion is only supported for command and command-light");
        }

        const {data, status, statusText} = await getAxios({
            maxRetries: this.params.maxRetries!,
            timeout: this.params.timeout!,
            rpm: this.params.rpm!,
            onRetry
        }).post(`${this.params.apiBase}/chat`, {
            conversation_id: this.conversationId,
            model: this.params.model,
            temperature: this.params.temperature,
            message: message
        }, {
            headers: {
                Authorization: `Bearer ${this.params.apiKey}`,
            }
        });

        if (status !== 200) {
            throw new Error(`Request failed with status ${status}: ${statusText}`);
        }

        const chatCompletionResponse: ChatCompletionResponse = {
            id: data.response_id,
            created: data.created,
            message: data.text,
            usage: {
                promptTokens: data.token_count.prompt_tokens,
                completionTokens: data.token_count.response_tokens,
                totalTokens: data.token_count.total_tokens,
            }
        }

        // this.processRequest(data.usage.completion_tokens);
        this.messages.push(...[
            {
                content: Array.isArray(message) ? message.slice(-1)[0].content : message,
                role: "user",
            },
            {
                content: chatCompletionResponse.message,
                role: "assistant",
            }
        ]);

        return chatCompletionResponse;
    }

    async chatCompletionWithStream(message: string, onRetry?: ((retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig<any>) => Promise<void>) | undefined): Promise<ChatCompletionWithStreamResponse> {
        throw new Error("Method not implemented.");
    }

    async getEmbeddings(
        input: string | string[], 
        options: CohereEmbeddingOptions,
        onRetry?: ((retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig<any>) => Promise<void>) | undefined): Promise<EdgeChainsEmbeddingsResponse> {
            if (this.params.model !== "embed-english-v2.0" && this.params.model !== "embed-english-light-v2.0" && this.params.model !== "embed-english-v3.0" && this.params.model !== "embed-english-light-v3.0") {
                throw new Error("getEmbeddings is only supported for embed-english-v2.0, embed-english-light-v2.0, embed-english-v3.0, and embed-english-light-v3.0");
            }

            const {data, status, statusText} = await getAxios({
                maxRetries: this.params.maxRetries!,
                timeout: this.params.timeout!,
                rpm: this.params.rpm!,
                onRetry
            }).post(`${this.params.apiBase}/embed`, {
                texts: Array.isArray(input) ? input : [input],
                model: this.params.model,
                input_type: options.inputType,
                truncate: options.truncate ?? "NONE",
                embedding_types: options.embedding_types ?? [],
            }, {
                headers: {
                    Authorization: `Bearer ${this.params.apiKey}`,
                }
            });

            if (status !== 200) {
                throw new Error(`Request failed with status ${status}: ${statusText}`);
            }

            console.log("data: ", data)
            console.log("eeeee: ", data.embeddings)

            const embeddingsResponse: EdgeChainsEmbeddingsResponse = {
                embeddings: data.embeddings[0], // don't know why they respond with a 2d array with just 1 row
                usage: {
                    promptTokens: data.meta.billed_units.input_tokens,
                    totalTokens: data.meta.billed_units.input_tokens,
                }
            }

            // this.processRequest(data.usage.prompt_tokens);

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