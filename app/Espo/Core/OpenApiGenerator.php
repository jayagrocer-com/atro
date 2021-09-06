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

declare(strict_types=1);

namespace Espo\Core;

use Espo\Core\Utils\Metadata;

class OpenApiGenerator
{
    private Container $container;

    public function __construct(Container $container)
    {
        $this->container = $container;
    }

    public function getData(): array
    {
        $result = [
            'openapi'    => '3.0.0',
            'info'       => [
                'version' => '1.0.0',
                'title'   => 'AtroCore REST API documentation'
            ],
            'servers'    => [
                [
                    'url' => '/api/v1'
                ]
            ],
            'tags'       => [],
            'security'   => [
                'Authorization-Token' => []
            ],
            'paths'      => [],
            'components' => [
                'schemas'         => [],
                'securitySchemes' => [
                    'Authorization-Token' => [
                        'type' => 'apiKey',
                        'name' => 'Authorization-Token',
                        'in'   => 'header'
                    ]
                ]
            ],
        ];

        /** @var Metadata $metadata */
        $metadata = $this->container->get('metadata');

        foreach ($metadata->get(['scopes'], []) as $scopeName => $scopeData) {
            $result['tags'][] = $scopeName;
            $result['paths']["/{$scopeName}"] = [
                'get' => [
                    'tags'        => [$scopeName],
                    "summary"     => "Returns a collection of $scopeName items",
                    "description" => "Returns a collection of $scopeName items",
                    "operationId" => "list",
                    'parameters'  => [
                        [
                            "name"     => "select",
                            "in"       => "query",
                            "required" => false,
                            "schema"   => [
                                "type"    => "string",
                                "example" => "name,createdAt"
                            ]
                        ],
                        [
                            "name"     => "offset",
                            "in"       => "query",
                            "required" => false,
                            "schema"   => [
                                "type"    => "integer",
                                "example" => 0
                            ]
                        ],
                        [
                            "name"     => "maxSize",
                            "in"       => "query",
                            "required" => false,
                            "schema"   => [
                                "type"    => "integer",
                                "example" => 50
                            ]
                        ],
                        [
                            "name"     => "sortBy",
                            "in"       => "query",
                            "required" => false,
                            "schema"   => [
                                "type"    => "string",
                                "example" => "name"
                            ]
                        ],
                        [
                            "name"     => "asc",
                            "in"       => "query",
                            "required" => false,
                            "schema"   => [
                                "type"    => "boolean",
                                "example" => "true"
                            ]
                        ],
                    ],
                    "responses"   => [
                        "200" => [
                            "description" => "OK",
                            "content"     => [
                                "application/json" => [
                                    "schema" => [
                                        "type"       => "object",
                                        "properties" => [
                                            "total" => [
                                                "type" => "integer"
                                            ],
                                            "list"  => [
                                                "type"  => "array",
                                                "items" => [
                                                    '$ref' => "#/components/schemas/$scopeName"
                                                ]
                                            ],
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        "400" => [
                            "description" => "Bad Request"
                        ],
                        "401" => [
                            "description" => "Unauthorized"
                        ],
                        "403" => [
                            "description" => "Forbidden"
                        ],
                        "404" => [
                            "description" => "Not Found"
                        ],
                        "500" => [
                            "description" => "Internal Server Error"
                        ],
                    ]
                ]
            ];
        }

        foreach ($metadata->get(['entityDefs'], []) as $entityName => $data) {
            if (empty($data['fields'])) {
                continue;
            }

            $result['components']['schemas'][$entityName] = [
                'type'       => 'object',
                'required'   => [],
                'properties' => [
                    'id'      => ['type' => 'string'],
                    'deleted' => ['type' => 'boolean'],
                ],
            ];

            foreach ($data['fields'] as $fieldName => $fieldData) {
                if (!empty($fieldData['noLoad']) || !empty($fieldData['emHidden'])) {
                    continue 1;
                }
                switch ($fieldData['type']) {
                    case "autoincrement":
                    case "int":
                        $result['components']['schemas'][$entityName]['properties'][$fieldName] = ['type' => 'integer'];
                        break;
                    case "bool":
                        $result['components']['schemas'][$entityName]['properties'][$fieldName] = ['type' => 'boolean'];
                        break;
                    case "jsonArray":
                    case "jsonObject":
                        $result['components']['schemas'][$entityName]['properties'][$fieldName] = ['type' => 'object'];
                        break;
                    case "currency":
                        $result['components']['schemas'][$entityName]['properties'][$fieldName] = ['type' => 'string'];
                        $result['components']['schemas'][$entityName]['properties']["{$fieldName}Currency"] = ['type' => 'string'];
                        break;
                    case "unit":
                        $result['components']['schemas'][$entityName]['properties'][$fieldName] = ['type' => 'string'];
                        $result['components']['schemas'][$entityName]['properties']["{$fieldName}Unit"] = ['type' => 'string'];
                        break;
                    case "array":
                    case "multiEnum":
                        $result['components']['schemas'][$entityName]['properties'][$fieldName] = ['type' => 'array', 'items' => ['type' => 'string']];
                        break;
                    case "asset":
                    case "file":
                    case "image":
                    case "link":
                    case "linkParent":
                        $result['components']['schemas'][$entityName]['properties']["{$fieldName}Id"] = ['type' => 'string'];
                        $result['components']['schemas'][$entityName]['properties']["{$fieldName}Name"] = ['type' => 'string'];
                        break;
                    case "linkMultiple":
                        $result['components']['schemas'][$entityName]['properties']["{$fieldName}Ids"] = ['type' => 'array', 'items' => ['type' => 'string']];
                        $result['components']['schemas'][$entityName]['properties']["{$fieldName}Names"] = ['type' => 'object'];
                        break;
                    default:
                        $result['components']['schemas'][$entityName]['properties'][$fieldName] = ['type' => 'string'];
                }
            }
        }

        foreach ($this->container->get('moduleManager')->getModules() as $module) {
            $module->prepareApiDocs($result);
        }

        return $result;
    }
}