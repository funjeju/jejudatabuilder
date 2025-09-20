import { GoogleGenAI, Type } from "@google/genai";
import type { InitialFormData, Place } from '../types';

// The API key is sourced from the environment variable `process.env.API_KEY`.
// It is assumed to be pre-configured and accessible in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const regionsDescription = `The administrative/travel region in Jeju. Must be one of: 제주시 동(洞) 지역, 애월읍, 한림읍, 한경면, 대정읍, 조천읍, 구좌읍, 성산읍, 우도면, 서귀포시 동(洞) 지역, 안덕면, 남원읍, 표선면.`;

const draftGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        place_name: { type: Type.STRING, description: "Name of the spot, refined from user input if necessary." },
        address: { type: Type.STRING, description: "The full address of the spot.", nullable: true },
        region: { type: Type.STRING, description: regionsDescription, nullable: true },
        location: {
            type: Type.OBJECT,
            properties: {
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
            },
            description: "Geographical coordinates.",
            nullable: true,
        },
        average_duration_minutes: { type: Type.NUMBER, description: "Estimated average time in minutes a visitor spends here. Infer from the description.", nullable: true },
        public_info: {
            type: Type.OBJECT,
            properties: {
                operating_hours: { type: Type.STRING, nullable: true },
                phone_number: { type: Type.STRING, nullable: true },
                website_url: { type: Type.STRING, nullable: true },
                closed_days: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Regular closing days of the week, e.g., ['월요일']", nullable: true },
            },
            description: "Publicly available information like business hours and contact.",
            nullable: true,
        },
        tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true,
            description: "A list of relevant tags or keywords for the spot, derived from the description."
        },
        attributes: {
            type: Type.OBJECT,
            properties: {
                targetAudience: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedSeasons: { type: Type.ARRAY, items: { type: Type.STRING } },
                withKids: { type: Type.STRING },
                withPets: { type: Type.STRING },
                parkingDifficulty: { type: Type.STRING },
                admissionFee: { type: Type.STRING },
                recommended_time_of_day: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Best time of day to visit, e.g., '오전', '일몰', '점심시간 피하기'", nullable: true },
            },
            description: "Core attributes of the spot, inferred from the description."
        },
        category_specific_info: {
            type: Type.OBJECT,
            properties: {
                signatureMenu: { type: Type.STRING, nullable: true },
                priceRange: { type: Type.STRING, nullable: true },
                difficulty: { type: Type.STRING, nullable: true },
            },
            description: "Additional information specific to certain categories, inferred from the description.",
            nullable: true,
        },
        expert_tip_final: { type: Type.STRING, description: "The refined, user-friendly version of the expert's tip, based on the expert's description." },
        comments: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    content: { type: Type.STRING },
                },
            },
            description: "Structured comments derived from the detailed expert description.",
            nullable: true,
        },
    },
    required: ["place_name", "attributes", "expert_tip_final"]
};


export const generateDraft = async (formData: InitialFormData): Promise<Partial<Place>> => {
    const prompt = `
# ROLE & GOAL
You are an AI data assistant for K-LOKAL, a Jeju travel platform. Your goal is to create a structured JSON data draft for a travel spot. You will use a mandatory expert description as the primary source of truth, and an optional URL for supplementary, objective information.

# INPUTS
1.  **Spot Name**: "${formData.spotName}"
2.  **Categories**: [${formData.categories.join(', ')}]
3.  **Expert's Description (Primary Source)**:
    """
    ${formData.spotDescription}
    """
4.  **Reference URL (Optional, for factual data)**: ${formData.importUrl || 'Not provided.'}

# INSTRUCTIONS
1.  **Analyze the Expert's Description**: This is the most important input. Extract subjective details, tips, atmosphere, and recommendations. This should be the basis for 'expert_tip_final', 'comments', 'attributes' like target audience, and 'tags'.
2.  **Analyze the Reference URL (if provided)**: Use the URL to find objective, factual data like 'address', 'region', 'public_info' (operating hours, phone, website, closed days), and 'location' coordinates.
3.  **Synthesize and Generate JSON**: Combine information from both sources into a single JSON object.
    *   If there are conflicts, prioritize the URL for factual data (address, phone) and the expert description for subjective data (tips, audience).
    *   **expert_tip_final**: Create a polished, user-friendly tip based on the expert's description. It should be concise and helpful for a general audience.
    *   **comments**: Break down the expert's description into several structured comments (e.g., type: "꿀팁", content: "..."). Generate at least 2-3 comments if possible.
    *   **attributes**: Infer the attributes (targetAudience, recommendedSeasons, withKids, withPets, parkingDifficulty, admissionFee, recommended_time_of_day) from the description. Be comprehensive.
    *   **public_info**: Extract operating_hours, phone_number, website_url, and closed_days.
    *   **average_duration_minutes**: Infer the average stay time in minutes. For example, a quick photo spot might be 20 minutes, a cafe 60 minutes, and a major attraction or beach 120 minutes.
    *   **region**: Determine the region from the address. It must be one of: "제주시 동(洞) 지역", "애월읍", "한림읍", "한경면", "대정읍", "조천읍", "구좌읍", "성산읍", "우도면", "서귀포시 동(洞) 지역", "안덕면", "남원읍", "표선면".
4.  **Output**: Return ONLY the generated JSON object that conforms to the schema. Do not include any other text, explanation, or markdown formatting. The spot name in the JSON should be exactly "${formData.spotName}".
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: draftGenerationSchema,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("API returned an empty response.");
        }
        
        return JSON.parse(jsonText) as Partial<Place>;

    } catch (error) {
        console.error("Error generating draft from AI:", error);
        throw new Error("Failed to generate AI draft. Please check the console for details.");
    }
};