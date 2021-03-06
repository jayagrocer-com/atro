<?php
/*
 * This file is part of EspoCRM and/or AtroCore.
 *
 * EspoCRM - Open Source CRM application.
 * Copyright (C) 2014-2019 Yuri Kuznetsov, Taras Machyshyn, Oleksiy Avramenko
 * Website: http://www.espocrm.com
 *
 * AtroCore is EspoCRM-based Open Source application.
 * Copyright (C) 2020 AtroCore UG (haftungsbeschränkt).
 *
 * AtroCore as well as EspoCRM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * AtroCore as well as EspoCRM is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EspoCRM. If not, see http://www.gnu.org/licenses/.
 *
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU General Public License version 3.
 *
 * In accordance with Section 7(b) of the GNU General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "EspoCRM" word
 * and "AtroCore" word.
 */

namespace Espo\Services;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\NotFound;
use Espo\Core\Templates\Services\Base;
use Espo\ORM\Entity;

class Connection extends Base
{
    public function testConnection(string $id): bool
    {
        $connection = $this->getRepository()->get($id);
        if (empty($connection)) {
            throw new NotFound();
        }

        $this->connect($connection);

        return true;
    }

    public function connect(Entity $connection)
    {
        $errorMessage = $this->getInjection('language')->translate('connectionFailed', 'exceptions', 'Connection');

        switch ($connection->get('type')) {
            case 'mysql':
                try {
                    $port = !empty($connection->get('port')) ? ';port=' . $connection->get('port') : '';
                    $dsn = 'mysql:host=' . $connection->get('host') . $port . ';dbname=' . $connection->get('dbName') . ';';
                    $result = new \PDO($dsn, $connection->get('user'), $this->decryptPassword($connection->get('password')));
                    $result->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
                } catch (\PDOException $e) {
                    throw new BadRequest(sprintf($errorMessage, $e->getMessage()));
                }
                break;
            case 'psql':
                try {
                    $port = !empty($connection->get('port')) ? ';port=' . $connection->get('port') : '';
                    $dsn = 'pgsql:host=' . $connection->get('host') . $port . ';dbname=' . $connection->get('dbName') . ';';
                    $result = new \PDO($dsn, $connection->get('user'), $this->decryptPassword($connection->get('password')));
                    $result->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
                } catch (\PDOException $e) {
                    throw new BadRequest(sprintf($errorMessage, $e->getMessage()));
                }
                break;
            case 'msql':
                if (!function_exists('sqlsrv_connect')) {
                    throw new BadRequest($this->getInjection('language')->translate('sqlsrvMissing', 'exceptions', 'Connection'));
                }
                $serverName = "{$connection->get('host')},{$connection->get('port')}";
                $connectionInfo = [
                    "Database"     => $connection->get('dbName'),
                    "Uid"          => $connection->get('user'),
                    "PWD"          => $this->decryptPassword($connection->get('password')),
                    "LoginTimeout" => 5
                ];
                $result = \sqlsrv_connect($serverName, $connectionInfo);
                if ($result === false) {
                    throw new BadRequest(sprintf($errorMessage, implode(', ', array_column(\sqlsrv_errors(), 'message'))));
                }
                break;
            default:
                throw new BadRequest(sprintf($errorMessage, $this->getInjection('language')->translate('noSuchType', 'exceptions', 'Connection')));
        }

        return $result;
    }

    public function createEntity($attachment)
    {
        if (property_exists($attachment, 'password')) {
            $attachment->password = $this->encryptPassword((string)$attachment->password);
        }

        return parent::createEntity($attachment);
    }

    public function updateEntity($id, $data)
    {
        if (property_exists($data, 'password')) {
            $data->password = $this->encryptPassword((string)$data->password);
        }

        return parent::updateEntity($id, $data);
    }

    public function encryptPassword(string $password): string
    {
        return openssl_encrypt($password, $this->getCypherMethod(), $this->getSecretKey(), 0, $this->getByteSecretIv());
    }

    public function decryptPassword(string $hash): string
    {
        return openssl_decrypt($hash, $this->getCypherMethod(), $this->getSecretKey(), 0, $this->getByteSecretIv());
    }

    protected function init()
    {
        parent::init();

        $this->addDependency('language');
    }

    protected function getByteSecretIv(): string
    {
        $ivFile = 'data/byte-secret-iv-' . strtolower($this->getCypherMethod()) . '.txt';
        if (file_exists($ivFile)) {
            $iv = file_get_contents($ivFile);
        } else {
            $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length($this->getCypherMethod()));
            file_put_contents($ivFile, $iv);
        }

        return $iv;
    }

    protected function getCypherMethod(): string
    {
        return $this->getConfig()->get('cypherMethod', 'AES-256-CBC');
    }

    protected function getSecretKey(): string
    {
        return $this->getConfig()->get('passwordSalt', 'ATRO');
    }

    protected function getFieldsThatConflict(Entity $entity, \stdClass $data): array
    {
        return [];
    }

    protected function isEntityUpdated(Entity $entity, \stdClass $data): bool
    {
        return true;
    }
}
