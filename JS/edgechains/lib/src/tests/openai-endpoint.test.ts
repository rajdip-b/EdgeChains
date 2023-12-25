import { OpenAiEndpointParams } from "../lib/endpoints/OpenAiEndpointV2";

const { describe } = require("node:test");
const { OpenAiEndpoint } = require("../lib/endpoints/OpenAiEndpointV2");

describe("OpenAI Endpoint", () => {
    const endpointParams: OpenAiEndpointParams = {
        apiBase: "https://api.openai.com/v1",
        apiKey: "test",
        model: "gpt-3.5-turbo",
    }
    const endpoint = new OpenAiEndpoint(endpointParams);

    it("should be able to create a new instance", () => {
        expect(endpoint).toBeInstanceOf(OpenAiEndpoint);
    });

    it("should not return null values for RPM, TPM and tokens", () => {
        expect(endpoint.params.rpm).not.toBeNull();
        expect(endpoint.params.tpm).not.toBeNull();
        expect(endpoint.params.tokens).not.toBeNull();
    })

    it("should not throw errors while setting timeout", () => {
        expect(() => endpoint.setTimeout(10000)).not.toThrow();
    })

    it("should not throw errors while setting max retries", () => {
        expect(() => endpoint.setMaxRetries(3)).not.toThrow();
    })

    test('chatCompletion method returns correct data', async () => {
        const response = await endpoint.chatCompletion("gpt-3.5-turbo", "Hello, my name is");
        expect(response).not.toBeNull();
        expect(response).toHaveProperty("id");
        expect(response).toHaveProperty("created");
        expect(response).toHaveProperty("model");
        expect(response).toHaveProperty("object");
        expect(response).toHaveProperty("choices");
        expect(response.choices).toHaveLength(1);
        expect(response.choices[0]).toHaveProperty("text");
        expect(response.choices[0]).toHaveProperty("index");
        expect(response.choices[0]).toHaveProperty("logprobs");
        expect(response.choices[0]).toHaveProperty("finish_reason");
    });
});