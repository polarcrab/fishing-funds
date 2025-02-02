import React, { useState, useEffect } from 'react';
import { useDebounceFn } from 'ahooks';
import { Input, message } from 'antd';
import CustomDrawer from '@/components/CustomDrawer';
import CustomDrawerContent from '@/components/CustomDrawer/Content';
import Empty from '@/components/Empty';
import { addCoinAction } from '@/store/features/coin';
import { SearchPromiseWorker } from '@/workers';
import { SearchRemoteCoinParams } from '@/workers/search.worker';
import { useDrawer, useAppDispatch, useAppSelector } from '@/utils/hooks';
import * as Helpers from '@/helpers';
import * as Enums from '@/utils/enums';
import styles from './index.module.scss';

const DetailCoinContent = React.lazy(() => import('@/components/Home/CoinView/DetailCoinContent'));

export interface AddCoinContentProps {
  defaultName?: string;
  onEnter: () => void;
  onClose: () => void;
}

const { Search } = Input;

const AddCoinContent: React.FC<AddCoinContentProps> = (props) => {
  const { defaultName } = props;
  const dispatch = useAppDispatch();
  const [coins, setCoins] = useState<Coin.RemoteCoin[]>([]);
  const { codeMap } = useAppSelector((state) => state.coin.config);
  const remoteCoins = useAppSelector((state) => state.coin.remoteCoins);
  const remoteCoinsMap = useAppSelector((state) => state.coin.remoteCoinsMap);
  const { data: detailCode, show: showDetailDrawer, set: setDetailDrawer, close: closeDetailDrawer } = useDrawer('');

  async function onAdd(code: string) {
    const coin = await Helpers.Coin.GetCoin(code);
    if (coin) {
      dispatch(
        addCoinAction({
          code: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name!,
        })
      );
    } else {
      message.error('数据出错或网络原因请多次尝试~');
    }
  }

  const { run: onSearch } = useDebounceFn(async (_value: string) => {
    const value = _value.trim();
    if (!value) {
      setCoins([]);
    } else {
      const searchPromiseWorker = new SearchPromiseWorker();
      const searchList = await searchPromiseWorker
        .postMessage<typeof remoteCoins, SearchRemoteCoinParams>({
          module: Enums.TabKeyType.Coin,
          list: remoteCoins,
          value,
        })
        .finally(() => searchPromiseWorker.terminate());
      setCoins(searchList);
    }
  });

  useEffect(() => {
    if (defaultName) {
      onSearch(defaultName);
    }
  }, [defaultName]);

  return (
    <CustomDrawerContent title="添加货币" enterText="确定" onEnter={props.onEnter} onClose={props.onClose}>
      <div className={styles.content}>
        <section>
          <label>关键字：</label>
          <Search defaultValue={defaultName} type="text" placeholder="货币代码或名称关键字" enterButton onSearch={onSearch} size="small" />
        </section>
      </div>
      {coins.length ? (
        coins.map(({ code }) => {
          const { symbol } = remoteCoinsMap[code];
          return (
            <div key={code} className={styles.stock} onClick={() => setDetailDrawer(code)}>
              <div>
                <div className={styles.name}>
                  <span className={styles.nameText}>{symbol.toUpperCase()}</span>
                </div>
                <div className={styles.code}>{code}</div>
              </div>
              {codeMap[code] ? (
                <button className={styles.added} disabled>
                  已添加
                </button>
              ) : (
                <button
                  className={styles.select}
                  onClick={(e) => {
                    onAdd(code);
                    e.stopPropagation();
                  }}
                >
                  自选
                </button>
              )}
            </div>
          );
        })
      ) : (
        <Empty text="暂无相关数据~" />
      )}
      <CustomDrawer show={showDetailDrawer}>
        <DetailCoinContent onEnter={closeDetailDrawer} onClose={closeDetailDrawer} code={detailCode} />
      </CustomDrawer>
    </CustomDrawerContent>
  );
};

export default AddCoinContent;
