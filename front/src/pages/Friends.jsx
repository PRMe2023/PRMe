import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Pagination from '../components/Pagination';
import Modal3 from '../components/Modal3';


const Friends = () => {
  const server = 'http://localhost:3002';
  const Navigate = useNavigate();

  const modal_text = '테스트 결과를 삭제하시겠습니까?'; 
  const modal_emoji = '🥲';

  const [modalOpen, setModalOpen] = useState(false); // 모달의 열림/닫힘 상태를 관리하는 상태 변수
  const [deletedFriendId, setDeletedFriendId] = useState(null); // 삭제할 친구의 ID를 저장하는 상태 변수

  const [friendsData, setFriendsData] = useState([
    // api데이터가 없어서 임의로 넣은 test용 데이터.
    // 실제 데이터 api넣어서 다시 test!
  /*
    {
      id: 1,
      name: "김지원",
      tags: ["#열정적", "#도전적", "#사교적"],
      date: "2023.05.30",
    },
    {
      id: 2,
      name: "김지둘",
      tags: ["#열정적", "#도전적", "#사교적"],
      date: "2023.05.31",
    },
    {
      id: 3,
      name: "김지셋",
      tags: ["#열정적", "#도전적", "#사교적"],
      date: "2023.06.01",
    },
    {
      id: 4,
      name: "김지넷",
      tags: ["#열정적", "#도전적", "#사교적"],
      date: "2023.06.02",
    },
    {
      id: 5,
      name: "김지다",
      tags: ["#열정적", "#도전적", "#사교적"],
      date: "2023.06.03",
    }, 
  */
    
  ]);
  const [currentPage, setCurrentPage] = useState(1); // 현재 페이지를 관리하는 상태 변수
  const itemsPerPage = 5;

  const fetchFriendsData = async () => {
    try {
      // API에서 친구 데이터를 가져오는 요청 수행
      const response = await fetch('API_URL_HERE');
      const data = await response.json();
      setFriendsData(data);
    } catch (error) {
      console.error('친구 데이터 가져오는 중 에러 발생:', error);
    }
  };

  const handlePageChange = (page) => {
    // 페이징 바뀌는지 확인
    // console.log('페이지 변경:', page);

    // 페이지 변경 시 현재 페이지 업데이트
    setCurrentPage(page);
  };

  const handleDeleteFriend = (friendId) => {
    setDeletedFriendId(friendId); // 삭제할 친구의 ID를 저장
    openModal(); // 모달 열기
  };

  const confirmDelete = () => {
    // 확인 버튼을 누를 때 저장된 친구의 ID를 사용하여 삭제
    const updatedFriendsData = friendsData.filter((friend) => friend.id !== deletedFriendId);
    setFriendsData(updatedFriendsData);
    closeModal(); // 모달 닫기
  };

  // 현재 페이지에 해당하는 데이터만 반환하는 함수
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    // 현재 페이지 데이터가 정확하게 반환되는지 확인
    // const currentPageData = friendsData.slice(startIndex, endIndex);
    // console.log('현재 페이지 데이터:', currentPageData);
    return friendsData.slice(startIndex, endIndex);
  };

  // 모달창
  const openModal = () => {
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
  };
   /* ------------------ jwt 인증 ------------------ */
   const accessT = () => {
    axios
    .get(`${ server }/accessT`, {
       withCredentials: true, // 요청 시 쿠키를 포함
    })
    .then(response => {
      if(response.data === 'TokenExpiredError'){ // accessToken 만료 시
        refreshT(); // 토큰 재발행
      } else {
        // 받을 데이터 처리
      }
    })
    .catch(error => {
      console.log('실패했어요:', error.response);
    })
  };

  // 토큰 재발행
  const refreshT = () => {
    axios
    .get(`${ server }/refreshT`, {
       withCredentials: true, // 요청 시 쿠키를 포함
    })
    .then(response => {
      // accessToken 갱신완료 시
      if(JSON.stringify(response.data.isLogin) === '"성공"'){
        // 서버로부터 토큰을 받아서 쿠키에 저장
       const accessToken = response.data.accesstoken;
       const refreshToken = response.data.refreshtoken;
       // 쿠키에 토큰 저장
       document.cookie = `accessToken=${ accessToken }; path=/;`
       document.cookie = `refreshToken=${ refreshToken }; path=/;`

       // 받을 데이터 처리
      }     
    })
    .catch(error => {
      console.log('실패했어요:', error.response);
    })
  };
  
  /* ------------------ 페이지 첫 실행 ------------------ */
  // 현재 페이지가 변경되면 데이터를 가져오기 위해 useEffect를 사용
  useEffect(() => {
    if(document.cookie){
      accessT();
    } else {
      Navigate('/login')
    };
    fetchFriendsData();
  }, [currentPage]);
  /* ---------------------------------------------------- */
  
  return (
    <div className='friends'>

      {/* 친구 데이터가 없을 때 no-friend 섹션을 표시 */}
      {friendsData.length === 0 ? (
        <div className='no-friend'>
          <div className='no-friend-text'>
            친구에게 받은 테스트 결과가 없습니다. <br />
            테스트 결과를 공유해 보세요😎
          </div>
        </div>
      ) : (
        <>
        {/* 친구 데이터를 사용하여 내용을 표시 */}
        {getCurrentPageData().map((friend) => (
          <div className={`friends-content ${friend.deleted ? 'hidden' : ''}`} key={friend.id}>
            <div className='friends-content-top'>
              <div className='friends-content-title'>
                <div id='friends-name'>{friend.name}</div>
                <div id='friends-others'>님이 보는 내 모습이예요!</div>
              </div>
              <button className='friends-delete' onClick={ () => handleDeleteFriend(friend.id)}>X</button>
            </div>

            <div className='friends-content-bottom'>
              <div className='friends-tags'>
                {friend.tags.map((tag, index) => (
                  <div className={`friends-tag${index + 1}`} key={index}>
                    {tag}
                  </div>
                ))}
              </div>
              <div className='friends-date'>{friend.date}</div>
            </div>
          </div>
        ))}

        <div>
          <Pagination
            activePage={currentPage}
            itemsCountPerPage={itemsPerPage}
            totalItemsCount={friendsData.length}
            onChange={handlePageChange}
          />
        </div>
      </>
      )}

      <Modal3 open={modalOpen} close={closeModal} header="모달 제목">
        <span id='modal-text'>{modal_text}</span>
        <span id='modal-emoji'>{modal_emoji}</span>
        <footer>
          <div className='modal2-buttons'>
            <button id='modal-close' onClick={closeModal}>취소</button>
            <button id='modal-close' onClick={confirmDelete}>확인</button>
          </div>
        </footer>
      </Modal3>
      
    </div>
  );
};

export default Friends;