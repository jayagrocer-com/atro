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

Espo.define('views/record/list', 'view', function (Dep) {

    return Dep.extend({

        template: 'record/list',/**
         * @param {String} Type of the list. Can be 'list', 'listSmall'.
         */
        type: 'list',

        name: 'list',

        presentationType: 'table',/**
         * @param {Bool} If true checkboxes will be shown.
         */
        checkboxes: true,/**
         * @param {Bool} If true clicking on the record link will trigger 'select' event with model passed.
         */
        selectable: false,

        rowActionsView: 'views/record/row-actions/default',

        rowActionsDisabled: false,

        scope: null,

        _internalLayoutType: 'list-row',

        listContainerEl: '.list > table > tbody',

        showCount: true,

        rowActionsColumnWidth: 25,

        buttonList: [],

        headerDisabled: false,

        massActionsDisabled: false,

        portalLayoutDisabled: false,

        events: {
            'click a.link': function (e) {
                e.stopPropagation();
                if (!this.scope || this.selectable) {
                    return;
                }
                e.preventDefault();
                var id = $(e.currentTarget).data('id');
                var model = this.collection.get(id);

                var scope = this.getModelScope(id);

                var options = {
                    id: id,
                    model: model
                };
                if (this.options.keepCurrentRootUrl) {
                    options.rootUrl = this.getRouter().getCurrentUrl();
                }

                this.getRouter().navigate('#' + scope + '/view/' + id, {trigger: false});
                this.getRouter().dispatch(scope, 'view', options);
            },
            'click [data-action="showMore"]': function () {
                this.showMoreRecords();
            },
            'click a.sort': function (e) {
                var field = $(e.currentTarget).data('name');
                this.toggleSort(field);
            },
            'click .pagination a': function (e) {
                var page = $(e.currentTarget).data('page');
                if ($(e.currentTarget).parent().hasClass('disabled')) {
                    return;
                }
                this.notify('Please wait...');
                this.collection.once('sync', function () {
                    this.notify(false);
                }.bind(this));

                if (page == 'current') {
                    this.collection.fetch();
                } else {
                    this.collection[page + 'Page'].call(this.collection);
                    this.trigger('paginate');
                }
                this.deactivate();
            },

            'click .record-checkbox': function (e) {
                var $target = $(e.currentTarget);
                var id = $target.data('id');
                if (e.currentTarget.checked) {
                    this.checkRecord(id, $target);
                } else {
                    this.uncheckRecord(id, $target);
                }
            },
            'click .select-all': function (e) {
                this.selectAllHandler(e.currentTarget.checked);
            },
            'click .action': function (e) {
                var $el = $(e.currentTarget);
                var action = $el.data('action');
                var method = 'action' + Espo.Utils.upperCaseFirst(action);
                if (typeof this[method] == 'function') {
                    var data = $el.data();
                    this[method](data, e);
                    e.preventDefault();
                }
            },
            'click .checkbox-dropdown [data-action="selectAllResult"]': function (e) {
                this.selectAllResult();
            },
            'click .actions a.mass-action': function (e) {
                $el = $(e.currentTarget);
                var action = $el.data('action');

                var method = 'massAction' + Espo.Utils.upperCaseFirst(action);
                if (method in this) {
                    this[method]();
                } else {
                    this.massAction(action);
                }
            }
        },

        toggleSort: function (field) {
            var asc = true;
            if (field === this.collection.sortBy && this.collection.asc) {
                asc = false;
            }
            this.notify('Please wait...');
            this.collection.once('sync', function () {
                this.notify(false);
                this.trigger('sort', {sortBy: field, asc: asc});
            }, this);
            var maxSizeLimit = this.getConfig().get('recordListMaxSizeLimit') || 200;
            while (this.collection.length > maxSizeLimit) {
                this.collection.pop();
            }
            this.collection.sort(field, asc);
            this.deactivate();
        },

        selectAllHandler: function (isChecked) {
            this.checkedList = [];

            var $actionsButton = this.$el.find('.actions-button');

            if (isChecked) {
                this.$el.find('input.record-checkbox').prop('checked', true);
                $actionsButton.removeAttr('disabled');
                this.collection.models.forEach(function (model) {
                    this.checkedList.push(model.id);
                }, this);
                this.$el.find('.list > table tbody tr').addClass('active');
            } else {
                if (this.allResultIsChecked) {
                    this.unselectAllResult();
                }
                this.$el.find('input.record-checkbox').prop('checked', false);
                $actionsButton.attr('disabled', true);
                this.$el.find('.list > table tbody tr').removeClass('active');
            }

            this.trigger('check');
        },/**
         * @param {string} or {bool} ['both', 'top', 'bottom', false, true] Where to display paginations.
         */
        pagination: false,/**
         * @param {bool} To dispaly table header with column names.
         */
        header: true,

        showMore: true,

        massActionList: ['remove', 'merge', 'massUpdate', 'export'],

        checkAllResultMassActionList: ['remove', 'massUpdate', 'export'],

        quickDetailDisabled: false,

        quickEditDisabled: false,/**
         * @param {array} Columns layout. Will be convered in 'Bull' typed layout for a fields rendering.
         *
         */
        listLayout: null,

        _internalLayout: null,

        checkedList: null,

        checkAllResultDisabled: false,

        buttonsDisabled: false,

        allResultIsChecked: false,

        data: function () {

            var paginationTop = this.pagination === 'both' || this.pagination === true || this.pagination === 'top';
            var paginationBottom = this.pagination === 'both' || this.pagination === true || this.pagination === 'bottom';
            return {
                scope: this.scope,
                header: this.header,
                headerDefs: this._getHeaderDefs(),
                paginationEnabled: this.pagination,
                paginationTop: paginationTop,
                paginationBottom: paginationBottom,
                showMoreActive: this.collection.total > this.collection.length || this.collection.total == -1,
                showMoreEnabled: this.showMore,
                showCount: this.showCount && this.collection.total > 0,
                moreCount: this.collection.total - this.collection.length,
                checkboxes: this.checkboxes,
                massActionList: this.massActionList,
                rowList: this.rowList,
                topBar: paginationTop || this.checkboxes || (this.buttonList.length && !this.buttonsDisabled),
                bottomBar: paginationBottom,
                checkAllResultDisabled: this.checkAllResultDisabled,
                buttonList: this.buttonList,
                displayTotalCount: this.displayTotalCount && this.collection.total > 0
            };
        },

        init: function () {
            this.listLayout = this.options.listLayout || this.listLayout;
            this.type = this.options.type || this.type;

            this.layoutName = this.options.layoutName || this.layoutName || this.type;

            this.headerDisabled = this.options.headerDisabled || this.headerDisabled;
            if (!this.headerDisabled) {
                this.header = _.isUndefined(this.options.header) ? this.header : this.options.header;
            } else {
                this.header = false;
            }
            this.pagination = _.isUndefined(this.options.pagination) ? this.pagination : this.options.pagination;
            this.checkboxes = _.isUndefined(this.options.checkboxes) ? this.checkboxes : this.options.checkboxes;
            this.selectable = _.isUndefined(this.options.selectable) ? this.selectable : this.options.selectable;
            this.rowActionsView = _.isUndefined(this.options.rowActionsView) ? this.rowActionsView : this.options.rowActionsView;
            this.showMore = _.isUndefined(this.options.showMore) ? this.showMore : this.options.showMore;

            this.massActionsDisabled = this.options.massActionsDisabled || this.massActionsDisabled;
            this.portalLayoutDisabled = this.options.portalLayoutDisabled || this.portalLayoutDisabled;

            if (this.massActionsDisabled && !this.selectable) {
                this.checkboxes = false;
            }

            this.rowActionsDisabled = this.options.rowActionsDisabled || this.rowActionsDisabled;

            if ('buttonsDisabled' in this.options) {
                this.buttonsDisabled = this.options.buttonsDisabled;
            }

            if ('checkAllResultDisabled' in this.options) {
                this.checkAllResultDisabled = this.options.checkAllResultDisabled;
            }
        },

        getModelScope: function (id) {
            return this.scope;
        },

        selectAllResult: function () {
            this.allResultIsChecked = true;

            this.$el.find('input.record-checkbox').prop('checked', true).attr('disabled', 'disabled');
            this.$el.find('input.select-all').prop('checked', true);

            this.massActionList.forEach(function(item) {
                if (!~this.checkAllResultMassActionList.indexOf(item)) {
                    this.$el.find('div.list-buttons-container .actions li a.mass-action[data-action="'+item+'"]').parent().addClass('hidden');
                }
            }, this);

            if (this.checkAllResultMassActionList.length) {
                this.$el.find('.actions-button').removeAttr('disabled');
            }

            this.$el.find('.list > table tbody tr').removeClass('active');

            this.trigger('select-all-results');
        },

        unselectAllResult: function () {
            this.allResultIsChecked = false;

            this.$el.find('input.record-checkbox').prop('checked', false).removeAttr('disabled');
            this.$el.find('input.select-all').prop('checked', false);


            this.massActionList.forEach(function(item) {
                if (!~this.checkAllResultMassActionList.indexOf(item)) {
                    this.$el.find('div.list-buttons-container .actions li a.mass-action[data-action="'+item+'"]').parent().removeClass('hidden');
                }
            }, this);
        },

        deactivate: function () {
            if (this.$el) {
                this.$el.find(".pagination li").addClass('disabled');
                this.$el.find("a.sort").addClass('disabled');
            }
        },

        export: function () {
            let data = {};
            if (this.allResultIsChecked) {
                data.where = this.collection.getWhere();
                data.selectData = this.collection.data || {};
                data.byWhere = true;
            } else {
                data.ids = this.checkedList;
            }

            let o = {
                scope: this.entityType,
                entityFilterData: data
            };

            var layoutFieldList = [];
            (this.listLayout || []).forEach(function (item) {
                if (item.name) {
                    layoutFieldList.push(item.name);
                }
            }, this);
            o.fieldList = layoutFieldList;

            this.createView('dialogExport', 'views/export/modals/export', o, function (view) {
                view.render();
            }, this);
        },

        massAction: function (name) {
            var bypassConfirmation = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name, 'bypassConfirmation']);
            var confirmationMsg = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name, 'confirmationMessage']) || 'confirmation';

            var proceed = function () {
                var acl = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name, 'acl']);
                var aclScope = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name, 'aclScope']);

                if (acl || aclScope) {
                    if (!this.getAcl().check(aclScope || this.scope, acl)) {
                        this.notify('Access denied', 'error');
                        return;
                    }
                }

                var idList = [];
                var data = {};

                if (this.allResultIsChecked) {
                    data.where = this.collection.getWhere();
                    data.selectData = this.collection.data || {};
                    data.byWhere = true;
                } else {
                    data.idList = idList;
                }

                for (var i in this.checkedList) {
                    idList.push(this.checkedList[i]);
                }

                data.entityType = this.entityType;

                var waitMessage = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name, 'waitMessage']) || 'pleaseWait';
                Espo.Ui.notify(this.translate(waitMessage, 'messages', this.scope));

                var url = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name, 'url']);

                this.ajaxPostRequest(url, data).then(function (result) {
                    var successMessage = result.successMessage || this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name, 'successMessage']) || 'done';

                    this.collection.fetch().then(function () {
                        var message = this.translate(successMessage, 'messages', this.scope);
                        if ('count' in result) {
                            message = message.replace('{count}', result.count);
                        }
                        Espo.Ui.success(message);
                    }.bind(this));
                }.bind(this));
            }

            if (!bypassConfirmation) {
                this.confirm(this.translate(confirmationMsg, 'messages', this.scope), proceed, this);
            } else {
                proceed.call(this);
            }
        },

        massActionRemove: function () {
            if (!this.getAcl().check(this.entityType, 'delete')) {
                this.notify('Access denied', 'error');
                return false;
            }

            var count = this.checkedList.length;
            var deletedCount = 0;

            var self = this;

            this.confirm({
                message: this.translate('removeSelectedRecordsConfirmation', 'messages'),
                confirmText: this.translate('Remove')
            }, function () {
                this.notify('Removing...');

                var ids = [];
                var data = {};
                if (this.allResultIsChecked) {
                    data.where = this.collection.getWhere();
                    data.selectData = this.collection.data || {};
                    data.byWhere = true;
                } else {
                    data.ids = ids;
                }

                for (var i in this.checkedList) {
                    ids.push(this.checkedList[i]);
                }

                $.ajax({
                    url: this.entityType + '/action/massDelete',
                    type: 'POST',
                    data: JSON.stringify(data)
                }).done(function (result) {
                    result = result || {};
                    var count = result.count;
                    if (this.allResultIsChecked) {
                        if (count) {
                            this.unselectAllResult();
                            this.listenToOnce(this.collection, 'sync', function () {
                                var msg = 'massRemoveResult';
                                if (count == 1) {
                                    msg = 'massRemoveResultSingle'
                                }
                                Espo.Ui.success(this.translate(msg, 'messages').replace('{count}', count));
                            }, this);
                            this.collection.fetch();
                            Espo.Ui.notify(false);
                        } else {
                            Espo.Ui.warning(self.translate('noRecordsRemoved', 'messages'));
                        }
                    } else {
                        var idsRemoved = result.ids || [];
                        if (count) {
                            idsRemoved.forEach(function (id) {
                                Espo.Ui.notify(false);

                                this.collection.trigger('model-removing', id);
                                this.removeRecordFromList(id);
                                this.uncheckRecord(id, null, true);

                            }, this);
                            var msg = 'massRemoveResult';
                            if (count == 1) {
                                msg = 'massRemoveResultSingle'
                            }
                            Espo.Ui.success(self.translate(msg, 'messages').replace('{count}', count));
                        } else {
                            Espo.Ui.warning(self.translate('noRecordsRemoved', 'messages'));
                        }
                    }
                }.bind(this));
            }, this);
        },

        massActionFollow: function () {
            var count = this.checkedList.length;

            var idList = [];
            for (var i in this.checkedList) {
                idList.push(this.checkedList[i]);
            }

            var confirmMsg = this.translate('confirmMassFollow', 'messages').replace('{count}', count.toString());
            this.confirm({
                message: confirmMsg,
                confirmText: this.translate('Follow')
            }, function () {
                Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
                this.ajaxPostRequest(this.entityType + '/action/massFollow', {
                    ids: idList
                }).then(function (result) {
                    var resultCount = result.count || 0;
                    var msg = 'massFollowResult';
                    if (resultCount) {
                        if (resultCount === 1) {
                            msg += 'Single';
                        }
                        Espo.Ui.success(this.translate(msg, 'messages').replace('{count}', resultCount));
                    } else {
                        Espo.Ui.warning(this.translate('massFollowZeroResult', 'messages'));
                    }
                }.bind(this));
            }, this);
        },

        massActionUnfollow: function () {
            var count = this.checkedList.length;

            var idList = [];
            for (var i in this.checkedList) {
                idList.push(this.checkedList[i]);
            }

            var confirmMsg = this.translate('confirmMassUnfollow', 'messages').replace('{count}', count.toString());
            this.confirm({
                message: confirmMsg,
                confirmText: this.translate('Unfollow')
            }, function () {
                Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
                this.ajaxPostRequest(this.entityType + '/action/massUnfollow', {
                    ids: idList
                }).then(function (result) {
                    var resultCount = result.count || 0;
                    var msg = 'massUnfollowResult';
                    if (resultCount) {
                        if (resultCount === 1) {
                            msg += 'Single';
                        }
                        Espo.Ui.success(this.translate(msg, 'messages').replace('{count}', resultCount));
                    } else {
                        Espo.Ui.warning(this.translate('massUnfollowZeroResult', 'messages'));
                    }
                }.bind(this));
            }, this);
        },

        massActionMerge: function () {
            if (!this.getAcl().check(this.entityType, 'edit')) {
                this.notify('Access denied', 'error');
                return false;
            }

            if (this.checkedList.length < 2) {
                this.notify('Select 2 or more records', 'error');
                return;
            }
            if (this.checkedList.length > 4) {
                this.notify('Select not more than 4 records', 'error');
                return;
            }
            this.checkedList.sort();
            var url = '#' + this.entityType + '/merge/ids=' + this.checkedList.join(',');
            this.getRouter().navigate(url, {trigger: false});
            this.getRouter().dispatch(this.entityType, 'merge', {
                ids: this.checkedList.join(','),
                collection: this.collection
            });
        },

        massActionMassUpdate: function () {
            if (!this.getAcl().check(this.entityType, 'edit')) {
                this.notify('Access denied', 'error');
                return false;
            }

            Espo.Ui.notify(this.translate('loading', 'messages'));
            var ids = false;
            var allResultIsChecked = this.allResultIsChecked;
            if (!allResultIsChecked) {
                ids = this.checkedList;
            }

            this.createView('massUpdate', 'views/modals/mass-update', {
                scope: this.entityType,
                ids: ids,
                where: this.collection.getWhere(),
                selectData: this.collection.data,
                byWhere: this.allResultIsChecked
            }, function (view) {
                view.render();
                view.notify(false);
                view.once('after:update', function (count) {
                    view.close();
                    this.listenToOnce(this.collection, 'sync', function () {
                        if (count) {
                            var msg = 'massUpdateResult';
                            if (count == 1) {
                                msg = 'massUpdateResultSingle'
                            }
                            Espo.Ui.success(this.translate(msg, 'messages').replace('{count}', count));
                        } else {
                            Espo.Ui.warning(this.translate('noRecordsUpdated', 'messages'));
                        }
                        if (allResultIsChecked) {
                            this.selectAllResult();
                        } else {
                            ids.forEach(function (id) {
                                this.checkRecord(id);
                            }, this);
                        }
                    }.bind(this));
                    this.collection.fetch();
                }, this);
            }.bind(this));
        },

        massActionExport: function () {
            this.export();
        },

        removeMassAction: function (item) {
            var index = this.massActionList.indexOf(item);
            if (~index) {
                this.massActionList.splice(index, 1);
            }
        },

        addMassAction: function (item, allResult) {
            this.massActionList.push(item);
            if (allResult) {
                this.checkAllResultMassActionList.push(item);
            }
        },

        setup: function () {
            if (typeof this.collection === 'undefined') {
                throw new Error('Collection has not been injected into Record.List view.');
            }

            this.layoutLoadCallbackList = [];

            this.entityType = this.collection.name || null;
            this.scope = this.options.scope || this.entityType;

            this.events = Espo.Utils.clone(this.events);
            this.massActionList = Espo.Utils.clone(this.massActionList);
            this.buttonList = Espo.Utils.clone(this.buttonList);

            if (!this.getAcl().checkScope(this.entityType, 'delete')) {
                this.removeMassAction('remove');
                this.removeMassAction('merge');
            }

            if (!this.getAcl().checkScope(this.entityType, 'edit')) {
                this.removeMassAction('massUpdate');
                this.removeMassAction('merge');
            }

            if (!this.getMetadata().get('scopes.ExportFeed') || !this.getAcl().checkScope('ExportFeed', 'read')) {
                this.removeMassAction('export');
                this.removeMassAction('export');
            }

            (this.getMetadata().get(['clientDefs', this.scope, 'massActionList']) || []).forEach(function (item) {
                var defs = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', item]) || {};
                var acl = defs.acl;
                var aclScope = defs.aclScope;
                if (acl || aclScope) {
                    if (!this.getAcl().check(aclScope || this.scope, acl)) {
                        return;
                    }
                }
                var configCheck = defs.configCheck;
                if (configCheck) {
                    var arr = configCheck.split('.');
                    if (!this.getConfig().getByPath(arr)) {
                        return;
                    }
                }
                this.massActionList.push(item);
            }, this);

            var checkAllResultMassActionList = [];
            this.checkAllResultMassActionList.forEach(function (item) {
                if (~this.massActionList.indexOf(item)) {
                    checkAllResultMassActionList.push(item);
                }
            }, this);
            this.checkAllResultMassActionList = checkAllResultMassActionList;

            (this.getMetadata().get(['clientDefs', this.scope, 'checkAllResultMassActionList']) || []).forEach(function (item) {
                if (~this.massActionList.indexOf(item)) {
                    var defs = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', item]) || {};
                    var acl = defs.acl;
                    var aclScope = defs.aclScope;
                    if (acl || aclScope) {
                        if (!this.getAcl().check(aclScope || this.scope, acl)) {
                            return;
                        }
                    }
                    var configCheck = defs.configCheck;
                    if (configCheck) {
                        var arr = configCheck.split('.');
                        if (!this.getConfig().getByPath(arr)) {
                            return;
                        }
                    }
                    this.checkAllResultMassActionList.push(item);
                }
            }, this);

            if (
                !this.massFollowDisabled &&
                this.getMetadata().get(['scopes', this.entityType, 'stream']) &&
                this.getAcl().check(this.entityType, 'stream')
            ) {
                this.addMassAction('follow');
                this.addMassAction('unfollow');
            }

            this.setupMassActionItems();

            if (this.selectable) {
                this.events['click .list a.link'] = function (e) {
                    e.preventDefault();
                    var id = $(e.target).data('id');
                    if (id) {
                        var model = this.collection.get(id);
                        if (this.checkboxes) {
                            var list = [];
                            list.push(model);
                            this.trigger('select', list);
                        } else {
                            this.trigger('select', model);
                        }
                    }
                    e.stopPropagation();
                };
            }

            if ('showCount' in this.options) {
                this.showCount = this.options.showCount;
            }
            this.displayTotalCount = this.showCount && this.getConfig().get('displayListViewRecordCount');

            if ('displayTotalCount' in this.options) {
                this.displayTotalCount = this.options.displayTotalCount;
            }

            if (this.options.massActionsDisabled) {
                this.massActionList = [];
            }

            if (!this.massActionList.length && !this.selectable) {
                this.checkboxes = false;
            }

            if (this.getUser().isPortal() && !this.portalLayoutDisabled) {
                if (this.getMetadata().get(['clientDefs', this.scope, 'additionalLayouts', this.layoutName + 'Portal'])) {
                    this.layoutName += 'Portal';
                }
            }

            this.listenTo(this.collection, 'sync', function (c, r, options) {
                if (this.hasView('modal') && this.getView('modal').isRendered()) return;
                if (this.noRebuild) {
                    this.noRebuild = null;
                    return;
                }
                this.checkedList = [];
                this.allResultIsChecked = false;
                this.buildRows(function () {
                    this.render();
                }.bind(this));
            }, this);

            this.checkedList = [];
            if (!this.options.skipBuildRows) {
                this.buildRows();
            }
        },

        afterRender: function () {
            if (this.allResultIsChecked) {
                this.selectAllResult();
            } else {
                if (this.checkedList.length) {
                    this.checkedList.forEach(function (id) {
                        this.checkRecord(id);
                    }, this);
                }
            }
        },

        setupMassActionItems: function () {},

        filterListLayout: function (listLayout) {
            if (this._cachedFilteredListLayout) {
                return this._cachedFilteredListLayout;
            }

            var forbiddenFieldList =this._cachedScopeForbiddenFieldList =
                this._cachedScopeForbiddenFieldList || this.getAcl().getScopeForbiddenFieldList(this.entityType, 'read');

            if (!forbiddenFieldList.length) {
                this._cachedFilteredListLayout = listLayout;
                return this._cachedFilteredListLayout;
            }

            let filteredListLayout = [];

            listLayout.forEach(item => {
                if (item.name && forbiddenFieldList.indexOf(item.name) < 0) {
                    filteredListLayout.push(item);
                }
            });

            this._cachedFilteredListLayout = filteredListLayout;

            return this._cachedFilteredListLayout;
        },

        _loadListLayout: function (callback) {
            this.layoutLoadCallbackList.push(callback);

            if (this.layoutIsBeingLoaded) return;

            this.layoutIsBeingLoaded = true;

            var layoutName = this.layoutName;

            this._helper.layoutManager.get(this.collection.name, layoutName, function (listLayout) {
                var filteredListLayout = this.filterListLayout(listLayout);
                this.layoutLoadCallbackList.forEach(function (callbackItem) {
                    callbackItem(filteredListLayout);
                    this.layoutLoadCallbackList = [];
                    this.layoutIsBeingLoaded = false;
                }, this);
            }.bind(this));
        },

        getSelectAttributeList: function (callback) {
            if (this.scope == null || this.rowHasOwnLayout) {
                callback(null);
                return;
            }

            if (this.listLayout) {
                var attributeList = this.fetchAttributeListFromLayout();
                callback(attributeList);
                return;
            } else {
                this._loadListLayout(function (listLayout) {
                    this.listLayout = listLayout;
                    var attributeList = this.fetchAttributeListFromLayout();
                    callback(attributeList);
                }.bind(this));
                return;
            }
        },

        fetchAttributeListFromLayout: function () {
            var list = [];
            this.listLayout.forEach(function (item) {
                if (!item.name) return;
                var field = item.name;
                var fieldType = this.getMetadata().get(['entityDefs', this.scope, 'fields', field, 'type']);
                if (!fieldType) return;
                this.getFieldManager().getAttributeList(fieldType, field).forEach(function (attribute) {
                    list.push(attribute);
                }, this);
            }, this);
            return list;
        },

        _getHeaderDefs: function () {
            var defs = [];

            for (var i in this.listLayout) {
                var width = false;

                if ('width' in this.listLayout[i] && this.listLayout[i].width !== null) {
                    width = this.listLayout[i].width + '%';
                } else if ('widthPx' in this.listLayout[i]) {
                    width = this.listLayout[i].widthPx;
                }

                var item = {
                    name: this.listLayout[i].name,
                    sortable: !(this.listLayout[i].notSortable || false),
                    width: width,
                    align: ('align' in this.listLayout[i]) ? this.listLayout[i].align : false,
                };
                if ('customLabel' in this.listLayout[i]) {
                    item.customLabel = this.listLayout[i].customLabel;
                    item.hasCustomLabel = true;
                }
                if (item.sortable) {
                    item.sorted = this.collection.sortBy === this.listLayout[i].name;
                    if (item.sorted) {
                        item.asc = this.collection.asc;
                    }
                }
                defs.push(item);
            };
            if (this.rowActionsView && !this.rowActionsDisabled) {
                defs.push({
                    width: this.rowActionsColumnWidth
                });
            }
            return defs;
        },

        _convertLayout: function (listLayout, model) {
            model = model || this.collection.model.prototype;

            var layout = [];

            if (this.checkboxes) {
                layout.push({
                    name: 'r-checkboxField',
                    columnName: 'r-checkbox',
                    template: 'record/list-checkbox'
                });
            }

            for (var i in listLayout) {
                var col = listLayout[i];
                var type = col.type || model.getFieldType(col.name) || 'base';
                if (!col.name) {
                    continue;
                }

                var item = {
                    columnName: col.name,
                    name: col.name + 'Field',
                    view: col.view || model.getFieldParam(col.name, 'view') || this.getFieldManager().getViewName(type),
                    options: {
                        defs: {
                            name: col.name,
                            params: col.params || {}
                        },
                        mode: 'list'
                    }
                };
                if (col.width) {
                    item.options.defs.width = col.width;
                }
                if (col.widthPx) {
                    item.options.defs.widthPx = col.widthPx;
                }

                if (col.link) {
                    item.options.mode = 'listLink';
                }
                if (col.align) {
                    item.options.defs.align = col.align;
                }
                layout.push(item);
            }
            if (this.rowActionsView && !this.rowActionsDisabled) {
                layout.push(this.getRowActionsDefs());
            }
            return layout;
        },

        checkRecord: function (id, $target, isSilent) {
            $target = $target || this.$el.find('.record-checkbox[data-id="' + id + '"]');

            if (!$target.size()) return;

            $target.get(0).checked = true;

            var index = this.checkedList.indexOf(id);
            if (index == -1) {
                this.checkedList.push(id);
            }

            $target.closest('tr').addClass('active');

            this.handleAfterCheck(isSilent);
        },

        uncheckRecord: function (id, $target, isSilent) {
            $target = $target || this.$el.find('.record-checkbox[data-id="' + id + '"]');
            if ($target.get(0)) {
                $target.get(0).checked = false;
            }

            var index = this.checkedList.indexOf(id);
            if (index != -1) {
                this.checkedList.splice(index, 1);
            }

            if ($target.get(0)) {
                $target.closest('tr').removeClass('active');
            }

            this.handleAfterCheck(isSilent);
        },

        handleAfterCheck: function (isSilent) {
            if (this.checkedList.length) {
                this.$el.find('.actions-button').removeAttr('disabled');
            } else {
                this.$el.find('.actions-button').attr('disabled', true);
            }

            if (this.checkedList.length == this.collection.models.length) {
                this.$el.find('.select-all').prop('checked', true);
            } else {
                this.$el.find('.select-all').prop('checked', false);
            }

            if (!isSilent) {
                this.trigger('check');
            }
        },

        getRowActionsDefs: function () {
            return {
                columnName: 'buttons',
                name: 'buttonsField',
                view: this.rowActionsView,
                options: {
                    defs: {
                        params: {
                        }
                    }
                }
            };
        },/**
         * Returns checked models.
         * @return {Array} Array of models
         */
        getSelected: function () {
            var list = [];
            this.$el.find('input.record-checkbox:checked').each(function (i, el) {
                var id = $(el).data('id');
                var model = this.collection.get(id);
                list.push(model);
            }.bind(this));
            return list;
        },

        getInternalLayoutForModel: function (callback, model) {
            var scope = model.name;
            if (this._internalLayout == null) {
                this._internalLayout = {};
            }
            if (!(scope in this._internalLayout)) {
                this._internalLayout[scope] = this._convertLayout(this.listLayout[scope], model);
            }
            callback(this._internalLayout[scope]);
        },

        getInternalLayout: function (callback, model) {
            if (this.scope == null || this.rowHasOwnLayout) {
                if (!model) {
                    callback(null);
                    return;
                } else {
                    this.getInternalLayoutForModel(callback, model);
                    return;
                }
            }
            if (this._internalLayout !== null) {
                callback(this._internalLayout);
                return;
            }
            if (this.listLayout !== null) {
                this._internalLayout = this._convertLayout(this.listLayout);
                callback(this._internalLayout);
                return;
            }
            this._loadListLayout(function (listLayout) {
                this.listLayout = listLayout;
                this._internalLayout = this._convertLayout(listLayout);
                callback(this._internalLayout);
                return;
            }.bind(this));
        },

        getItemEl: function (model, item) {
            return this.options.el + ' tr[data-id="' + model.id + '"] td.cell[data-name="' + item.columnName + '"]';
        },

        prepareInternalLayout: function (internalLayout, model) {
            internalLayout.forEach(function (item) {
                item.el = this.getItemEl(model, item);
            }, this);
        },

        buildRow: function (i, model, callback) {
            var key = model.id;

            this.rowList.push(key);
            this.getInternalLayout(function (internalLayout) {
                internalLayout = Espo.Utils.cloneDeep(internalLayout);
                this.prepareInternalLayout(internalLayout, model);

                var acl =  {
                    edit: this.getAcl().checkModel(model, 'edit'),
                    delete: this.getAcl().checkModel(model, 'delete')
                };

                this.createView(key, 'views/base', {
                    model: model,
                    acl: acl,
                    el: this.options.el + ' .list-row[data-id="'+key+'"]',
                    optionsToPass: ['acl'],
                    noCache: true,
                    _layout: {
                        type: this._internalLayoutType,
                        layout: internalLayout
                    },
                    name: this.type + '-' + model.name,
                    setViewBeforeCallback: this.options.skipBuildRows && !this.isRendered()
                }, callback);
            }.bind(this), model);
        },

        buildRows: function (callback) {
            this.checkedList = [];
            this.rowList = [];

            if (this.collection.length > 0) {
                var i = 0;
                var c = !this.pagination ? 1 : 2;
                var func = function () {
                    i++;
                    if (i == c) {
                        if (typeof callback == 'function') {
                            callback();
                        }
                    }
                }

                this.wait(true);

                var modelList = this.collection.models;
                var count = modelList.length;
                var built = 0;
                modelList.forEach(function (model) {
                    this.buildRow(i, model, function () {
                        built++;
                        if (built == count) {
                            func();
                            this.wait(false);
                            this.trigger('after:build-rows');
                        }
                    }.bind(this));
                }, this);


                if (this.pagination) {
                    this.createView('pagination', 'views/record/list-pagination', {
                        collection: this.collection
                    }, func);
                }
            } else {
                if (typeof callback == 'function') {
                    callback();
                    this.trigger('after:build-rows');
                }
            }
        },

        showMoreRecords: function (collection, $list, $showMore, callback) {
            collection = collection || this.collection;

            $showMore =  $showMore || this.$el.find('.show-more');
            $list = $list || this.$el.find(this.listContainerEl);

            $showMore.children('a').addClass('disabled');

            Espo.Ui.notify(this.translate('loading', 'messages'));

            var final = function () {
                $showMore.parent().append($showMore);
                if (
                    (collection.total > collection.length + collection.lengthCorrection || collection.total == -1)
                ) {
                    this.$el.find('.more-count').text(collection.total - collection.length - collection.lengthCorrection);
                    $showMore.removeClass('hidden');
                }
                $showMore.children('a').removeClass('disabled');

                if (this.allResultIsChecked) {
                    this.$el.find('input.record-checkbox').attr('disabled', 'disabled').prop('checked', true);
                }

                Espo.Ui.notify(false);

                if (callback) {
                    callback.call(this);
                }
            }.bind(this);

            var initialCount = collection.length;

            var success = function () {
                Espo.Ui.notify(false);
                $showMore.addClass('hidden');

                var rowCount = collection.length - initialCount;
                var rowsReady = 0;
                if (collection.length <= initialCount) {
                    final();
                }
                for (var i = initialCount; i < collection.length; i++) {
                    var model = collection.at(i);
                    this.buildRow(i, model, function (view) {
                        var model = view.model;
                        view.getHtml(function (html) {
                            var $row = $(this.getRowContainerHtml(model.id));
                            $row.append(html);
                            $list.append($row);
                            rowsReady++;
                            if (rowsReady == rowCount) {
                                final();
                            }
                            view._afterRender();
                            if (view.options.el) {
                                view.setElement(view.options.el);
                            }
                        }.bind(this));
                    });
                }
                this.noRebuild = true;
            }.bind(this);

            this.listenToOnce(collection, 'update', function (collection, o) {
                if (o.changes.merged.length) {
                    collection.lengthCorrection += o.changes.merged.length;
                }
            }, this);

            collection.fetch({
                success: success,
                remove: false,
                more: true
            });
        },

        getRowContainerHtml: function (id) {
            return '<tr data-id="'+id+'" class="list-row"></tr>';
        },

        actionQuickView: function (data) {
            data = data || {};
            var id = data.id;
            if (!id) return;

            var model = null;
            if (this.collection) {
                model = this.collection.get(id);
            }
            if (!data.scope && !model) {
                return;
            }

            var scope = data.scope || model.name || this.scope;

            var viewName = this.getMetadata().get('clientDefs.' + scope + '.modalViews.detail') || 'views/modals/detail';

            if (!this.quickDetailDisabled) {
                Espo.Ui.notify(this.translate('loading', 'messages'));

                var options = {
                    scope: scope,
                    model: model,
                    id: id
                };
                if (this.options.keepCurrentRootUrl) {
                    options.rootUrl = this.getRouter().getCurrentUrl();
                }
                this.createView('modal', viewName, options, function (view) {
                    this.listenToOnce(view, 'after:render', function () {
                        Espo.Ui.notify(false);
                    });
                    view.render();

                    this.listenToOnce(view, 'remove', function () {
                        this.clearView('modal');
                    }, this);

                    this.listenToOnce(view, 'after:edit-cancel', function () {
                        this.actionQuickView({id: view.model.id, scope: view.model.name});
                    }, this);

                    this.listenToOnce(view, 'after:save', function (model) {
                        this.trigger('after:save', model);
                    }, this);
                }, this);
            } else {
                this.getRouter().navigate('#' + scope + '/view/' + id, {trigger: true});
            }
        },

        actionQuickEdit: function (data) {
            data = data || {}
            var id = data.id;
            if (!id) return;

            var model = null;
            if (this.collection) {
                model = this.collection.get(id);
            }
            if (!data.scope && !model) {
                return;
            }

            var scope = data.scope || model.name || this.scope;

            var viewName = this.getMetadata().get('clientDefs.' + scope + '.modalViews.edit') || 'views/modals/edit';

            if (!this.quickEditDisabled) {
                Espo.Ui.notify(this.translate('loading', 'messages'));
                var options = {
                    scope: scope,
                    id: id,
                    model: model,
                    fullFormDisabled: data.noFullForm,
                    returnUrl: this.getRouter().getCurrentUrl(),
                    returnDispatchParams: {
                        controller: scope,
                        action: null,
                        options: {
                            isReturn: true
                        }
                    }
                };
                if (this.options.keepCurrentRootUrl) {
                    options.rootUrl = this.getRouter().getCurrentUrl();
                }
                this.createView('modal', viewName, options, function (view) {
                    view.once('after:render', function () {
                        Espo.Ui.notify(false);
                    });

                    view.render();

                    this.listenToOnce(view, 'remove', function () {
                        this.clearView('modal');
                    }, this);

                    this.listenToOnce(view, 'after:save', function (m) {
                        var model = this.collection.get(m.id);
                        if (model) {
                            model.set(m.getClonedAttributes());
                        }

                        this.trigger('after:save', m);

                        let parent = this.getParentView();
                        let panelName = parent && parent.defs && parent.defs.name ? parent.defs.name : this.relationName;

                        if (panelName) {
                            $('.panel-navigation .nav a[data-name="' + panelName + '"]').click();
                        }
                    }, this);
                }, this);
            } else {
                var options = {
                    id: id,
                    model: this.collection.get(id),
                    returnUrl: this.getRouter().getCurrentUrl(),
                    returnDispatchParams: {
                        controller: scope,
                        action: null,
                        options: {
                            isReturn: true
                        }
                    }
                };
                if (this.options.keepCurrentRootUrl) {
                    options.rootUrl = this.getRouter().getCurrentUrl();
                }
                this.getRouter().navigate('#' + scope + '/edit/' + id, {trigger: false});
                this.getRouter().dispatch(scope, 'edit', options);
            }
        },

        getRowSelector: function (id) {
            return 'tr[data-id="' + id + '"]';
        },

        actionQuickRemove: function (data) {
            data = data || {}
            var id = data.id;
            if (!id) return;

            var model = this.collection.get(id);
            if (!this.getAcl().checkModel(model, 'delete')) {
                this.notify('Access denied', 'error');
                return false;
            }

            let message = this.getMetadata().get(`clientDefs.${this.scope}.deleteConfirmation`) || 'Global.messages.removeRecordConfirmation'
            let parts = message.split('.');

            this.confirm({
                message: this.translate(parts.pop(), parts.pop(), parts.pop()),
                confirmText: this.translate('Remove')
            }, function () {
                this.collection.trigger('model-removing', id);
                this.collection.remove(model);
                this.notify('Removing...');
                model.destroy({
                    wait: true,
                    success: function () {
                        this.notify('Removed', 'success');
                        this.removeRecordFromList(id);
                    }.bind(this),
                    error: function () {
                        this.notify('Error occured', 'error');
                        this.collection.push(model);
                    }.bind(this)
                });
            }, this);
        },

        removeRecordFromList: function (id) {
            this.collection.remove(id);
            if (this.collection.total > 0) {
                this.collection.total--;
            }
            this.$el.find('.total-count-span').text(this.collection.total.toString());

            var index = this.checkedList.indexOf(id);
            if (index != -1) {
                this.checkedList.splice(index, 1);
            }

            this.removeRowHtml(id);
            var key = id;
            this.clearView(key);
            var index = this.rowList.indexOf(key);
            if (~index) {
                this.rowList.splice(index, 1);
            }
        },

        removeRowHtml: function (id) {
            this.$el.find(this.getRowSelector(id)).remove();
            if (this.collection.length == 0 && (this.collection.total == 0 || this.collection.total === -2)) {
                this.reRender();
            }
        }
    });
});
