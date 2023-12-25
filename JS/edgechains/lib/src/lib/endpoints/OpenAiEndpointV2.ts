// import { AxiosError, AxiosRequestConfig } from "axios";
// import { Message } from "../util/message";
// import { Transform } from "stream";
// import EdgeChainsEndpoint, { ChatCompletionResponse, ChatCompletionWithStreamResponse, EdgeChainEndpointParams, EdgeChainsEmbeddingsResponse, getAxios } from "./EdgeChainsEndpoint";

// export interface OpenAiEndpointParams extends EdgeChainEndpointParams {
//     model: 'gpt-4' | 'gpt-4-0613' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-1106' | 'text-embedding-ada-002'
// }

// const transformStream = new Transform({
//     transform(chunk, _, callback) {
//       const chunkString = chunk.toString();
//       const chunkObject = JSON.parse(chunkString);
   
//       const formattedObject: ChatCompletionWithStreamResponse = {
//         id: chunkObject.id,
//         created: chunkObject.created,
//         message: {
//             role: 'assistant',
//             content: chunkObject.choices[0].delta.content || "",
//         },
//       };
   
//       callback(null, JSON.stringify(formattedObject));
//     },
// });

// export class OpenAiEndpointV2 implements EdgeChainsEndpoint {
//     tpmRemaining: number = 0;
//     rpmRemaining: number = 0;

//     constructor(public params: OpenAiEndpointParams) {
//         this.params.maxRetries = this.params.maxRetries || 3;
//         this.params.timeout = this.params.timeout || 30000;
//         this.params.temperature = this.params.temperature || 0.7;
//         this.params.topP = this.params.topP || 0.75;
//         this.params.topK = this.params.topK || 0;

//         switch (this.params.model) {
//             case "gpt-3.5-turbo":
//                 this.params.tokens = this.params.tokens || 4096;
//                 this.params.tpm = this.params.tpm || 40000;
//                 this.params.rpm = this.params.rpm || 3;
//             case "gpt-3.5-turbo-1106":
//                 this.params.tokens = this.params.tokens || 16385;
//                 this.params.tpm = this.params.tpm || 40000;
//                 this.params.rpm = this.params.rpm || 3;
//             case "gpt-4":
//                 this.params.tokens = this.params.tokens || 8192;
//                 this.params.tpm = this.params.tpm || 40000;
//                 this.params.rpm = this.params.rpm || 3;
//             case "gpt-4-0613":
//                 this.params.tokens = this.params.tokens || 8192;
//                 this.params.tpm = this.params.tpm || 40000;
//                 this.params.rpm = this.params.rpm || 3;
//             case "text-embedding-ada-002":
//                 this.params.tokens = this.params.tokens || 32768;
//                 this.params.tpm = this.params.tpm || 150000;
//                 this.params.rpm = this.params.rpm || 3;
//         }

//         setInterval(() => {
//             this.rpmRemaining = this.params.rpm!;
//             this.tpmRemaining = this.params.tpm!;
//         }, 60000);
//     }

//     async chatCompletion(
//         messages: Message[], 
//         onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
//         : Promise<ChatCompletionResponse> {
//         if (this.params.model === 'text-embedding-ada-002') {
//             throw new Error('Chat completion is not supported for text-embedding-ada-002');
//         }

//         const {data, status, statusText} = await getAxios({
//             maxRetries: this.params.maxRetries!,
//             timeout: this.params.timeout!,
//             rpm: this.params.rpm!,
//             onRetry
//         }).post(`${this.params.apiBase}/chat/completions`, {
//             model: this.params.model,
//             messages: messages,
//             temperature: this.params.temperature,
//         }, {
//             headers: {
//                 'Authorization': `Bearer ${this.params.apiKey}`,
//             },
//         });
        
//         if (status !== 200) {
//             throw new Error(`Request failed with status ${status}: ${statusText}`);
//         }

//         const chatCompletionResponse: ChatCompletionResponse = {
//             id: data.id,
//             created: data.created,
//             messages: data.choices.map(choice => choice.message),
//             usage: data.usage,
//         }

//         this.processRequest(chatCompletionResponse.usage.totalTokens);

//         return chatCompletionResponse;
//     }

//     async chatCompletionWithStream(
//         messages: Message[], 
//         onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
//         : Promise<ChatCompletionWithStreamResponse> {
//         if (this.params.model === 'text-embedding-ada-002') {
//             throw new Error('Chat completion is not supported for text-embedding-ada-002');
//         }

//         const {data, status, statusText} = await getAxios({
//             maxRetries: this.params.maxRetries!,
//             timeout: this.params.timeout!,
//             rpm: this.params.rpm!,
//             onRetry
//         }).post(`${this.params.apiBase}/chat/completions`, 
//         {
//             model: this.params.model,
//             messages: messages,
//             temperature: this.params.temperature,
//             stream: true,
//         }, {
//             responseType: 'stream',
//             headers: {
//                 'Authorization': `Bearer ${this.params.apiKey}`,
//             },
//         });
        
//         if (status !== 200) {
//             throw new Error(`Request failed with status ${status}: ${statusText}`);
//         }

//         return data.pipe(transformStream);
//     }
 
//     async getEmbeddings(
//         input: string | string[], 
//         onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => Promise<void>)
//         : Promise<EdgeChainsEmbeddingsResponse> {
//         if (this.params.model !== 'text-embedding-ada-002') {
//             throw new Error('Embeddings are only supported for text-embedding-ada-002');
//         }

//         const response = await getAxios({
//             maxRetries: this.params.maxRetries!,
//             timeout: this.params.timeout!,
//             rpm: this.params.rpm!,
//             onRetry
//         }).post(`${this.params.apiBase}/embeddings`, {
//             model: this.params.model,
//             input,
//         }, {
//             headers: {
//                 'Authorization': `Bearer ${this.params.apiKey}`,
//             },
//         });
        
//         const embeddingResponse: EdgeChainsEmbeddingsResponse = {
//             embeddings: response.data.data[0].embeddings,
//             usage: response.data.data.usage,
//         };

//         this.processRequest(embeddingResponse.usage.totalTokens);

//         return embeddingResponse;
//     }
 
//     // async encode(text: string): Promise<string> {
//     //     const {data, status, statusText} = await axios.post(`${this.params.apiBase}/encodings`, {
//     //         model: this.params.model,
//     //         text: text,
//     //     }, {
//     //         headers: {
//     //             'Authorization': `Bearer ${this.params.apiKey}`,
//     //         },
//     //     });
        
//     //     if (status !== 200) {
//     //         throw new Error(`Request failed with status ${status}: ${statusText}`);
//     //     }

//     //     return data;
//     // }
 
//     // async decode(text: string | string[]): Promise<string> {
//     //     const {data, status, statusText} = await axios.post(`${this.params.apiBase}/decodings`, {
//     //         model: this.params.model,
//     //         text: text,
//     //     }, {
//     //         headers: {
//     //             'Authorization': `Bearer ${this.params.apiKey}`,
//     //         },
//     //     });
        
//     //     if (status !== 200) {
//     //         throw new Error(`Request failed with status ${status}: ${statusText}`);
//     //     }

//     //     return data;
//     // }

//     setMaxRetries(maxRetries: number): void {
//         this.params.maxRetries = maxRetries;
//     }

//     setTimeout(timeout: number): void {
//         this.params.timeout = timeout;
//     }

//     setTemprature(temperature: number): void {
//         this.params.temperature = temperature;
//     }

//     getAvailableLimits(): {
//         tpmRemaining: number;
//         rpmRemaining: number;
//     } {
//         return {
//             tpmRemaining: this.tpmRemaining,
//             rpmRemaining: this.rpmRemaining,
//         }
//     }

//     private processRequest(tokensUsed: number): void {
//         this.rpmRemaining -= 1;
//         this.tpmRemaining -= tokensUsed;
//     }
// }