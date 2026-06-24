<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'ai_provider_id' => $this->ai_provider_id,
            'ai_provider' => new AiProviderResource($this->whenLoaded('aiProvider')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
