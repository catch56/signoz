import { RadioChangeEvent } from 'antd';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import { defaultOptionsQuery, URL_OPTIONS } from './constants';
import { InitialOptions, OptionsMenuConfig, OptionsQuery } from './types';
import { getInitialColumns, getOptionsFromKeys } from './utils';

interface UseOptionsMenuProps {
	dataSource: DataSource;
	aggregateOperator: string;
	initialOptions?: InitialOptions;
}

interface UseOptionsMenu {
	isLoading: boolean;
	options: OptionsQuery;
	config: OptionsMenuConfig;
}

const useOptionsMenu = ({
	dataSource,
	aggregateOperator,
	initialOptions = {},
}: UseOptionsMenuProps): UseOptionsMenu => {
	const {
		query: optionsQuery,
		queryData: optionsQueryData,
		redirectWithQuery: redirectWithOptionsData,
	} = useUrlQueryData<OptionsQuery>(URL_OPTIONS);

	const { data, isFetched, isLoading } = useQuery(
		[QueryBuilderKeys.GET_ATTRIBUTE_KEY],
		async () =>
			getAggregateKeys({
				searchText: '',
				dataSource,
				aggregateOperator,
				aggregateAttribute: '',
			}),
	);

	const attributeKeys = useMemo(() => data?.payload?.attributeKeys || [], [
		data?.payload?.attributeKeys,
	]);

	const initialOptionsQuery: OptionsQuery = useMemo(
		() => ({
			...defaultOptionsQuery,
			...initialOptions,
			selectColumns: initialOptions?.selectColumns
				? getInitialColumns(initialOptions?.selectColumns || [], attributeKeys)
				: defaultOptionsQuery.selectColumns,
		}),
		[initialOptions, attributeKeys],
	);

	const options = useMemo(() => getOptionsFromKeys(attributeKeys), [
		attributeKeys,
	]);

	const selectedColumnKeys = useMemo(
		() => optionsQueryData?.selectColumns?.map(({ id }) => id) || [],
		[optionsQueryData],
	);

	const handleSelectedColumnsChange = useCallback(
		(value: string[]) => {
			const newSelectedColumnKeys = [
				...new Set([...selectedColumnKeys, ...value]),
			];
			const newSelectedColumns = newSelectedColumnKeys.reduce((acc, key) => {
				const column = attributeKeys.find(({ id }) => id === key);

				if (!column) return acc;
				return [...acc, column];
			}, [] as BaseAutocompleteData[]);

			redirectWithOptionsData({
				...defaultOptionsQuery,
				selectColumns: newSelectedColumns,
			});
		},
		[attributeKeys, selectedColumnKeys, redirectWithOptionsData],
	);

	const handleRemoveSelectedColumn = useCallback(
		(columnKey: string) => {
			redirectWithOptionsData({
				...defaultOptionsQuery,
				selectColumns: optionsQueryData?.selectColumns?.filter(
					({ id }) => id !== columnKey,
				),
			});
		},
		[optionsQueryData, redirectWithOptionsData],
	);

	const handleFormatChange = useCallback(
		(event: RadioChangeEvent) => {
			redirectWithOptionsData({
				...defaultOptionsQuery,
				format: event.target.value,
			});
		},
		[redirectWithOptionsData],
	);

	const handleMaxLinesChange = useCallback(
		(value: string | number | null) => {
			redirectWithOptionsData({
				...defaultOptionsQuery,
				maxLines: value as number,
			});
		},
		[redirectWithOptionsData],
	);

	const optionsMenuConfig: Required<OptionsMenuConfig> = useMemo(
		() => ({
			addColumn: {
				value: selectedColumnKeys || defaultOptionsQuery.selectColumns,
				options: options || [],
				onChange: handleSelectedColumnsChange,
				onRemove: handleRemoveSelectedColumn,
			},
			format: {
				value: optionsQueryData?.format || defaultOptionsQuery.format,
				onChange: handleFormatChange,
			},
			maxLines: {
				value: optionsQueryData?.maxLines || defaultOptionsQuery.maxLines,
				onChange: handleMaxLinesChange,
			},
		}),
		[
			options,
			selectedColumnKeys,
			optionsQueryData?.maxLines,
			optionsQueryData?.format,
			handleSelectedColumnsChange,
			handleRemoveSelectedColumn,
			handleFormatChange,
			handleMaxLinesChange,
		],
	);

	useEffect(() => {
		if (optionsQuery || !isFetched) return;

		redirectWithOptionsData(initialOptionsQuery);
	}, [isFetched, optionsQuery, initialOptionsQuery, redirectWithOptionsData]);

	return {
		isLoading,
		options: optionsQueryData,
		config: optionsMenuConfig,
	};
};

export default useOptionsMenu;
