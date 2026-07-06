<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;

class EncryptionService
{
    /**
     * Criptografa um valor usando AES-256 via Laravel Crypt
     */
    public static function encrypt(string $value): string
    {
        return Crypt::encryptString($value);
    }

    /**
     * Descriptografa um valor
     */
    public static function decrypt(string $encryptedValue): string
    {
        try {
            return Crypt::decryptString($encryptedValue);
        } catch (\Exception $e) {
            return $encryptedValue;
        }
    }

    /**
     * Mascara a API key para exibição (mostra apenas primeiros e últimos caracteres)
     */
    public static function mask(string $value): string
    {
        $len = strlen($value);
        if ($len <= 8) return str_repeat('*', $len);
        return substr($value, 0, 4) . str_repeat('*', $len - 8) . substr($value, -4);
    }
}
