/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { Button, Col, Row, Space, Typography } from 'antd';
import { ReactComponent as EditIcon } from 'assets/svg/edit-new.svg';
import { ReactComponent as PlusIcon } from 'assets/svg/plus-primary.svg';
import DescriptionV1 from 'components/common/description/DescriptionV1';
import ProfilePicture from 'components/common/ProfilePicture/ProfilePicture';
import { UserSelectableList } from 'components/common/UserSelectableList/UserSelectableList.component';
import { UserTeamSelectableList } from 'components/common/UserTeamSelectableList/UserTeamSelectableList.component';
import DomainExperts from 'components/Domain/DomainExperts/DomainExperts.component';
import DomainTypeSelectForm from 'components/Domain/DomainTypeSelectForm/DomainTypeSelectForm.component';
import { usePermissionProvider } from 'components/PermissionProvider/PermissionProvider';
import { ResourceEntity } from 'components/PermissionProvider/PermissionProvider.interface';
import TagButton from 'components/TagButton/TagButton.component';
import {
  DE_ACTIVE_COLOR,
  getTeamAndUserDetailsPath,
  getUserPath,
  NO_DATA_PLACEHOLDER,
} from 'constants/constants';
import { EntityField } from 'constants/Feeds.constants';
import { EntityType } from 'enums/entity.enum';
import { Domain, DomainType } from 'generated/entity/domains/domain';
import { Operation } from 'generated/entity/policies/policy';
import { ChangeDescription, EntityReference } from 'generated/entity/type';
import { cloneDeep, includes, isEmpty, isEqual } from 'lodash';
import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getEntityName } from 'utils/EntityUtils';
import {
  getChangedEntityNewValue,
  getChangedEntityOldValue,
  getDiffByFieldName,
  getDiffValue,
  getEntityVersionByField,
} from 'utils/EntityVersionUtils';
import { checkPermission } from 'utils/PermissionsUtils';
import '../../domain.less';
import { DocumentationTabProps } from './DocumentationTab.interface';

const DocumentationTab = ({
  domain,
  onUpdate,
  isVersionsView = false,
}: DocumentationTabProps) => {
  const { t } = useTranslation();
  const { permissions } = usePermissionProvider();
  const [isDescriptionEditable, setIsDescriptionEditable] =
    useState<boolean>(false);
  const [editDomainType, setEditDomainType] = useState(false);

  const { editDescriptionPermission, editOwnerPermission, editAllPermission } =
    useMemo(() => {
      if (isVersionsView) {
        return {
          editDescriptionPermission: false,
          editOwnerPermission: false,
          editAllPermission: false,
        };
      }

      const editDescription = checkPermission(
        Operation.EditDescription,
        ResourceEntity.DOMAIN,
        permissions
      );

      const editOwner = checkPermission(
        Operation.EditOwner,
        ResourceEntity.DOMAIN,
        permissions
      );

      const editAll = checkPermission(
        Operation.EditAll,
        ResourceEntity.DOMAIN,
        permissions
      );

      return {
        editDescriptionPermission: editDescription || editAll,
        editOwnerPermission: editOwner || editAll,
        editAllPermission: editAll,
      };
    }, [permissions, isVersionsView]);

  const getOwner = useCallback(
    (ownerDisplayName: ReactNode, owner?: EntityReference) => {
      if (owner) {
        return (
          <>
            <ProfilePicture
              displayName={getEntityName(owner)}
              id={owner?.id || ''}
              name={owner?.name ?? ''}
              textClass="text-xs"
              width="20"
            />
            <Link
              to={
                owner.type === 'team'
                  ? getTeamAndUserDetailsPath(owner.name ?? '')
                  : getUserPath(owner.name ?? '')
              }>
              {ownerDisplayName}
            </Link>
          </>
        );
      }
      if (!(editOwnerPermission || editAllPermission)) {
        return <div>{NO_DATA_PLACEHOLDER}</div>;
      }

      return null;
    },
    [editOwnerPermission, editAllPermission]
  );

  const getUserNames = useCallback(
    (glossaryData: Domain) => {
      if (isVersionsView) {
        const ownerDiff = getDiffByFieldName(
          EntityField.OWNER,
          glossaryData.changeDescription as ChangeDescription
        );

        const oldOwner = JSON.parse(
          getChangedEntityOldValue(ownerDiff) ?? '{}'
        );
        const newOwner = JSON.parse(
          getChangedEntityNewValue(ownerDiff) ?? '{}'
        );

        const shouldShowDiff =
          !isEmpty(ownerDiff.added) ||
          !isEmpty(ownerDiff.deleted) ||
          !isEmpty(ownerDiff.updated);

        if (shouldShowDiff) {
          if (!isEmpty(ownerDiff.added)) {
            const ownerName = getDiffValue('', getEntityName(newOwner));

            return getOwner(ownerName, newOwner);
          }

          if (!isEmpty(ownerDiff.deleted)) {
            const ownerName = getDiffValue(getEntityName(oldOwner), '');

            return getOwner(ownerName, oldOwner);
          }

          if (!isEmpty(ownerDiff.updated)) {
            const ownerName = getDiffValue(
              getEntityName(oldOwner),
              getEntityName(newOwner)
            );

            return getOwner(ownerName, newOwner);
          }
        }
      }

      return getOwner(getEntityName(glossaryData.owner), glossaryData.owner);
    },
    [isVersionsView, getOwner]
  );

  const description = useMemo(
    () =>
      isVersionsView
        ? getEntityVersionByField(
            domain.changeDescription as ChangeDescription,
            EntityField.DESCRIPTION,
            domain.description
          )
        : domain.description,

    [domain, isVersionsView]
  );

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (domain.description !== updatedHTML) {
      const updatedTableDetails = {
        ...domain,
        description: updatedHTML,
      };
      onUpdate(updatedTableDetails);
      setIsDescriptionEditable(false);
    } else {
      setIsDescriptionEditable(false);
    }
  };

  const handleUpdatedOwner = (newOwner: Domain['owner']) => {
    const updatedData = {
      ...domain,
      owner: newOwner,
    };
    onUpdate(updatedData);
  };

  const handleExpertsUpdate = (data: Array<EntityReference>) => {
    if (!isEqual(data, domain.experts)) {
      let updatedDomain = cloneDeep(domain);
      const oldExperts = data.filter((d) => includes(domain.experts, d));
      const newExperts = data
        .filter((d) => !includes(domain.experts, d))
        .map((d) => ({
          id: d.id,
          type: d.type,
          name: d.name,
          displayName: d.displayName,
        }));
      updatedDomain = {
        ...updatedDomain,
        experts: [...oldExperts, ...newExperts],
      };
      onUpdate(updatedDomain);
    }
  };

  const handleDomainTypeUpdate = async (domainType: string) => {
    let updatedDomain = cloneDeep(domain);
    updatedDomain = {
      ...updatedDomain,
      domainType: domainType as DomainType,
    };
    await onUpdate(updatedDomain);
    setEditDomainType(false);
  };

  return (
    <Row>
      <Col className="border-right p-md domain-content-container" span={18}>
        <DescriptionV1
          description={description}
          entityName={getEntityName(domain)}
          entityType={EntityType.DOMAIN}
          hasEditAccess={editDescriptionPermission}
          isEdit={isDescriptionEditable}
          showCommentsIcon={false}
          onCancel={() => setIsDescriptionEditable(false)}
          onDescriptionEdit={() => setIsDescriptionEditable(true)}
          onDescriptionUpdate={onDescriptionUpdate}
        />
      </Col>
      <Col className="p-md" span={6}>
        <Row gutter={[0, 40]}>
          <Col data-testid="domain-owner-name" span="24">
            <div className="d-flex items-center m-b-xss">
              <Typography.Text className="right-panel-label">
                {t('label.owner')}
              </Typography.Text>
              {editOwnerPermission && domain.owner && (
                <UserTeamSelectableList
                  hasPermission
                  owner={domain.owner}
                  onUpdate={handleUpdatedOwner}>
                  <Button
                    className="cursor-pointer flex-center m-l-xss"
                    data-testid="edit-owner"
                    icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
                    size="small"
                    type="text"
                  />
                </UserTeamSelectableList>
              )}
            </div>

            <Space className="m-r-xss" size={4}>
              {getUserNames(domain)}
            </Space>

            {!domain.owner && editOwnerPermission && (
              <UserTeamSelectableList
                hasPermission
                owner={domain.owner}
                onUpdate={handleUpdatedOwner}>
                <TagButton
                  className="tw-text-primary cursor-pointer"
                  icon={<PlusIcon height={16} name="plus" width={16} />}
                  label={t('label.add')}
                  tooltip=""
                />
              </UserTeamSelectableList>
            )}
          </Col>
          <Col data-testid="domain-expert-name" span="24">
            <div
              className={`d-flex items-center ${
                domain.experts && domain.experts.length > 0 ? 'm-b-xss' : ''
              }`}>
              <Typography.Text
                className="right-panel-label"
                data-testid="domain-expert-heading-name">
                {t('label.expert-plural')}
              </Typography.Text>
              {editOwnerPermission &&
                domain.experts &&
                domain.experts.length > 0 && (
                  <UserSelectableList
                    hasPermission
                    popoverProps={{ placement: 'topLeft' }}
                    selectedUsers={domain.experts ?? []}
                    onUpdate={handleExpertsUpdate}>
                    <Button
                      className="cursor-pointer flex-center m-l-xss"
                      data-testid="edit-expert-button"
                      icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
                      size="small"
                      type="text"
                    />
                  </UserSelectableList>
                )}
            </div>
            <DomainExperts
              domain={domain}
              editPermission={editAllPermission}
              isVersionsView={isVersionsView}
            />
            <div>
              {editOwnerPermission &&
                domain.experts &&
                domain.experts.length === 0 && (
                  <UserSelectableList
                    hasPermission={editOwnerPermission}
                    popoverProps={{ placement: 'topLeft' }}
                    selectedUsers={domain.experts ?? []}
                    onUpdate={handleExpertsUpdate}>
                    <TagButton
                      className="tw-text-primary cursor-pointer"
                      icon={<PlusIcon height={16} name="plus" width={16} />}
                      label={t('label.add')}
                      tooltip=""
                    />
                  </UserSelectableList>
                )}
            </div>
          </Col>
          <Col data-testid="domainType" span="24">
            <div className="d-flex items-center m-b-xss">
              <Typography.Text
                className="right-panel-label"
                data-testid="domainType-heading-name">
                {t('label.domain-type')}
              </Typography.Text>
              {editAllPermission && domain.domainType && (
                <Button
                  className="cursor-pointer flex-center m-l-xss"
                  data-testid="edit-domainType-button"
                  icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
                  size="small"
                  type="text"
                  onClick={() => setEditDomainType(true)}
                />
              )}
            </div>
            {!editDomainType && (
              <Space wrap data-testid="domain-type-label" size={6}>
                {domain.domainType}
              </Space>
            )}

            {editDomainType && (
              <DomainTypeSelectForm
                defaultValue={domain.domainType}
                onCancel={() => setEditDomainType(false)}
                onSubmit={handleDomainTypeUpdate}
              />
            )}
          </Col>
        </Row>
      </Col>
    </Row>
  );
};

export default DocumentationTab;